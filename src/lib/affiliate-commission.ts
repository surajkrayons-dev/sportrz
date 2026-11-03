import type { PoolConnection, ResultSetHeader } from 'mysql2/promise';

/**
 * Idempotently create the commission for a captured Razorpay payment.
 *
 * New referral records explicitly store UTC timestamps in verify-otp/route.ts.
 * Commission eligibility is based on the immutable referral association plus a
 * captured payment, not by comparing legacy DATETIME values: older records may
 * have been written with the database server's local timezone. The unique key
 * on payment_record_id plus INSERT IGNORE protects retries and concurrent calls.
 */
export async function ensureAffiliateCommissionForPayment(
  connection: PoolConnection,
  paymentRecordId: number,
): Promise<number> {
  const [result] = await connection.execute<ResultSetHeader>(
    `INSERT IGNORE INTO affiliate_commissions
       (affiliate_user_id, referred_user_id, payment_record_id,
        amount_paise, commission_percent, commission_paise, status)
     SELECT
        ar.affiliate_user_id,
        ar.referred_user_id,
        p.id,
        p.amount_paise,
        ap.commission_percent,
        FLOOR(p.amount_paise * ap.commission_percent / 100),
        'pending'
     FROM payments p
     JOIN affiliate_referrals ar
       ON ar.referred_user_id = p.user_id
      AND ar.status = 'qualified'
     JOIN affiliate_profiles ap
       ON ap.user_id = ar.affiliate_user_id
      AND ap.status = 'active'
     JOIN users au
       ON au.id = ap.user_id
      AND au.account_role = 'affiliate'
      AND au.status = 'active'
     WHERE p.id = ?
       AND p.provider = 'razorpay'
       AND p.status = 'captured'
       AND p.paid_at IS NOT NULL
     LIMIT 1`,
    [paymentRecordId],
  );

  return result.affectedRows;
}
