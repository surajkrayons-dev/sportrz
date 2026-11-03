import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getPool } from '@/lib/mysql';
import { getCurrentUser } from '@/lib/session';
import { getRazorpayConfig } from '@/lib/payment-settings';
import { ensureAffiliateCommissionForPayment } from '@/lib/affiliate-commission';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in before verifying a payment.' }, { status: 401 });

    const body = await request.json();
    const orderId = String(body.razorpay_order_id || '');
    const paymentId = String(body.razorpay_payment_id || '');
    const signature = String(body.razorpay_signature || '');
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: 'Missing required payment details.' }, { status: 400 });
    }

    const razorpayConfig = await getRazorpayConfig();
    const razorpayKeyId = razorpayConfig?.keyId;
    const razorpaySecret = razorpayConfig?.secret;
    if (!razorpayKeyId || !razorpaySecret) {
      return NextResponse.json({ error: 'Razorpay credentials are not configured on the server.' }, { status: 500 });
    }

    const [orderRows] = await getPool().execute<any[]>(
      `SELECT p.id, p.user_id, p.plan_id, p.amount_paise, p.currency, p.status,
              p.order_id, p.provider_payment_id, pl.code AS plan_code, pl.duration_days
       FROM payments p
       INNER JOIN plans pl ON pl.id = p.plan_id
       WHERE p.order_id = ? AND p.user_id = ? AND p.provider = 'razorpay'
       LIMIT 1`,
      [orderId, user.uid],
    );
    const order = orderRows[0];
    if (!order) return NextResponse.json({ error: 'Payment order not found for this account.' }, { status: 404 });

    // A previous deployment or a transient issue may have captured the payment
    // before the commission was written. Reconcile idempotently on every retry.
    if (order.status === 'captured') {
      const connection = await getPool().getConnection();
      try {
        await connection.beginTransaction();
        await ensureAffiliateCommissionForPayment(connection, Number(order.id));
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      return NextResponse.json({ success: true, message: 'Payment already verified.' });
    }
    if (order.status !== 'created' && order.status !== 'authorized') {
      return NextResponse.json({ error: 'This payment order is not payable.' }, { status: 409 });
    }

    const expectedSignature = createHmac('sha256', razorpaySecret).update(`${orderId}|${paymentId}`).digest('hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const actualBuffer = Buffer.from(signature, 'hex');
    if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
      return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 });
    }

    const authorization = Buffer.from(`${razorpayKeyId}:${razorpaySecret}`).toString('base64');
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Basic ${authorization}` },
    });
    const paymentData = await paymentResponse.json();
    if (!paymentResponse.ok) {
      console.error('Razorpay payment lookup failed:', paymentData);
      return NextResponse.json({ error: 'Unable to verify payment with Razorpay.' }, { status: 502 });
    }
    if (paymentData.order_id !== orderId || paymentData.status !== 'captured' || Number(paymentData.amount) !== Number(order.amount_paise) || paymentData.currency !== order.currency) {
      return NextResponse.json({ error: 'Payment details do not match the recorded order.' }, { status: 400 });
    }

    const durationDays = Number(order.duration_days);
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
      return NextResponse.json({ error: 'The purchased plan duration is invalid.' }, { status: 500 });
    }

    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [lockedRows] = await connection.execute<any[]>(
        'SELECT status FROM payments WHERE id = ? AND user_id = ? FOR UPDATE',
        [order.id, user.uid],
      );
      if (!lockedRows.length) throw new Error('Payment order disappeared during verification.');
      if (lockedRows[0].status === 'captured') {
        await ensureAffiliateCommissionForPayment(connection, Number(order.id));
        await connection.commit();
        return NextResponse.json({ success: true, message: 'Payment already verified.' });
      }

      await connection.execute(
        `UPDATE payments
         SET status = 'captured', provider_payment_id = ?, paid_at = UTC_TIMESTAMP(), provider_payload = ?, updated_at = UTC_TIMESTAMP()
         WHERE id = ?`,
        [paymentId, JSON.stringify(paymentData), order.id],
      );
      await connection.execute(
        `UPDATE subscriptions SET status = 'expired', updated_at = UTC_TIMESTAMP()
         WHERE user_id = ? AND status = 'active' AND end_at IS NOT NULL AND end_at <= UTC_TIMESTAMP()`,
        [user.uid],
      );
      await connection.execute(
        `UPDATE subscriptions SET status = 'cancelled', updated_at = UTC_TIMESTAMP()
         WHERE user_id = ? AND status = 'active'`,
        [user.uid],
      );
      await connection.execute(
        `INSERT INTO subscriptions (user_id, plan_id, payment_record_id, status, source, start_at, end_at)
         VALUES (?, ?, ?, 'active', 'purchase', UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${durationDays} DAY))`,
        [user.uid, Number(order.plan_id), Number(order.id)],
      );
      // Create a commission snapshot using the same idempotent path used by retries.
      await ensureAffiliateCommissionForPayment(connection, Number(order.id));
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const [subscriptionRows] = await pool.execute<any[]>(
      `SELECT start_at, end_at FROM subscriptions
       WHERE user_id = ? AND payment_record_id = ? ORDER BY id DESC LIMIT 1`,
      [user.uid, Number(order.id)],
    );
    const savedSubscription = subscriptionRows[0];
    return NextResponse.json({
      success: true,
      message: 'Payment verified and subscription activated.',
      subscription: {
        plan: order.plan_code,
        paymentId,
        orderId,
        startDate: savedSubscription?.start_at ? new Date(savedSubscription.start_at).toISOString() : new Date().toISOString(),
        endDate: savedSubscription?.end_at ? new Date(savedSubscription.end_at).toISOString() : new Date(Date.now() + durationDays * 86400000).toISOString(),
        isActive: true,
      },
    });
  } catch (error) {
    console.error('Payment verification failed:', error);
    return NextResponse.json({ error: 'Payment verification failed. Please contact support if money was deducted.' }, { status: 500 });
  }
}
