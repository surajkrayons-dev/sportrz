import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';

export class PaymentSettlementError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.name = 'PaymentSettlementError'; this.status = status; }
}

export interface CapturedRazorpayPayment {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  rawPayload: unknown;
  expectedUserId?: string;
}

export async function finalizeCapturedRazorpayPayment(input: CapturedRazorpayPayment) {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const query = `SELECT p.id, p.user_id, p.plan_id, p.amount_paise, p.currency, p.status, p.provider_payment_id,
                          pl.code AS plan_code, pl.duration_days
                   FROM payments p JOIN plans pl ON pl.id = p.plan_id
                   WHERE p.order_id = ? AND p.provider = 'razorpay' ${input.expectedUserId ? 'AND p.user_id = ?' : ''}
                   LIMIT 1 FOR UPDATE`;
    const args = input.expectedUserId ? [input.orderId, input.expectedUserId] : [input.orderId];
    const [orders] = await connection.execute<Array<RowDataPacket & {
      id: number; user_id: string; plan_id: number; amount_paise: number; currency: string; status: string;
      provider_payment_id: string | null; plan_code: string; duration_days: number | null;
    }>>(query, args);
    const order = orders[0];
    if (!order) throw new PaymentSettlementError('Payment order not found.', 404);
    if (input.status !== 'captured' || input.orderId.length === 0 || input.paymentId.length === 0) throw new PaymentSettlementError('Payment is not captured.');
    if (input.amount !== Number(order.amount_paise) || input.currency !== order.currency) throw new PaymentSettlementError('Payment amount or currency does not match the order.');
    if (order.provider_payment_id && order.provider_payment_id !== input.paymentId) throw new PaymentSettlementError('A different payment is already attached to this order.', 409);
    if (!['created', 'authorized', 'captured'].includes(order.status)) throw new PaymentSettlementError('This order is not payable.', 409);

    const durationDays = order.duration_days == null ? null : Number(order.duration_days);
    if (durationDays !== null && (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650)) throw new PaymentSettlementError('The purchased plan duration is invalid.', 500);

    if (order.status !== 'captured' || !order.provider_payment_id) {
      await connection.execute(
        `UPDATE payments SET status = 'captured', provider_payment_id = ?, paid_at = UTC_TIMESTAMP(), provider_payload = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?`,
        [input.paymentId, JSON.stringify(input.rawPayload), order.id],
      );
    }

    const [existingSubscriptionRows] = await connection.execute<Array<RowDataPacket & { id: number; start_at: Date | string | null; end_at: Date | string | null }>>(
      'SELECT id, start_at, end_at FROM subscriptions WHERE payment_record_id = ? ORDER BY id DESC LIMIT 1 FOR UPDATE', [order.id],
    );
    let savedSubscription = existingSubscriptionRows[0];
    if (!savedSubscription) {
      await connection.execute(
        `UPDATE subscriptions SET status = 'expired', updated_at = UTC_TIMESTAMP()
         WHERE user_id = ? AND status = 'active' AND end_at IS NOT NULL AND end_at <= UTC_TIMESTAMP()`, [order.user_id],
      );
      await connection.execute(
        `UPDATE subscriptions SET status = 'cancelled', updated_at = UTC_TIMESTAMP() WHERE user_id = ? AND status = 'active'`, [order.user_id],
      );
      await connection.execute(
        `INSERT INTO subscriptions (user_id, plan_id, payment_record_id, status, source, start_at, end_at)
         VALUES (?, ?, ?, 'active', 'purchase', UTC_TIMESTAMP(), ${durationDays === null ? 'NULL' : 'DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY)'})`,
        durationDays === null ? [order.user_id, Number(order.plan_id), Number(order.id)] : [order.user_id, Number(order.plan_id), Number(order.id), durationDays],
      );
      const [newRows] = await connection.execute<Array<RowDataPacket & { id: number; start_at: Date | string | null; end_at: Date | string | null }>>(
        'SELECT id, start_at, end_at FROM subscriptions WHERE payment_record_id = ? ORDER BY id DESC LIMIT 1', [order.id],
      );
      savedSubscription = newRows[0];
    }

    // This is idempotent per payment_record_id. The stored percentage is a snapshot of the profile rate at capture time.
    await connection.execute(
      `INSERT IGNORE INTO affiliate_commissions (affiliate_user_id, referred_user_id, payment_record_id, amount_paise, commission_percent, commission_paise, status)
       SELECT ar.affiliate_user_id, ar.referred_user_id, p.id, p.amount_paise, ap.commission_percent,
              FLOOR(p.amount_paise * ap.commission_percent / 100), 'pending'
       FROM payments p
       JOIN affiliate_referrals ar ON ar.referred_user_id = p.user_id AND ar.status = 'qualified' AND COALESCE(p.paid_at, p.created_at) >= ar.created_at
       JOIN affiliate_profiles ap ON ap.user_id = ar.affiliate_user_id AND ap.status = 'active'
       JOIN users au ON au.id = ap.user_id AND au.account_role = 'affiliate' AND au.status = 'active'
       WHERE p.id = ? LIMIT 1`, [Number(order.id)],
    );

    await connection.commit();
    const toIso = (value: Date | string | null | undefined): string | null => {
      if (!value) return null;
      return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
    };
    return {
      alreadyApplied: Boolean(existingSubscriptionRows[0]),
      userId: order.user_id,
      planCode: order.plan_code,
      paymentId: input.paymentId,
      orderId: input.orderId,
      subscription: {
        startDate: toIso(savedSubscription?.start_at) || new Date().toISOString(),
        endDate: toIso(savedSubscription?.end_at),
        isActive: true,
      },
    };
  } catch (error) {
    try { await connection.rollback(); } catch { /* Ignore rollback after a failed transaction/commit. */ }
    throw error;
  } finally { connection.release(); }
}
