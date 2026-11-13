import type { PoolConnection, ResultSetHeader } from 'mysql2/promise';

/**
 * Creates an affiliate commission and its optional external postback outbox row.
 *
 * Attribution is based on the immutable referral association and a captured
 * payment that happened after the referral was created. Unique keys make both
 * inserts safe to execute repeatedly from browser verification and Razorpay
 * webhook retries.
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
      AND COALESCE(p.paid_at, p.created_at) >= ar.created_at
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
     LIMIT 1`,
    [paymentRecordId],
  );

  // Queue a postback only for external partners with a configured destination.
  // The destination is snapshotted so later profile edits do not rewrite history.
  await connection.execute(
    `INSERT IGNORE INTO affiliate_postback_deliveries
       (affiliate_user_id, commission_id, destination_url, http_method, status)
     SELECT ac.affiliate_user_id, ac.id, ap.postback_url, COALESCE(ap.postback_method, 'POST'), 'pending'
       FROM affiliate_commissions ac
       JOIN affiliate_profiles ap ON ap.user_id = ac.affiliate_user_id
       JOIN users au ON au.id = ap.user_id
      WHERE ac.payment_record_id = ?
        AND ap.affiliate_type = 'external_website'
        AND ap.postback_url IS NOT NULL
        AND ap.postback_url <> ''
        AND ap.status = 'active'
        AND au.account_role = 'affiliate'
        AND au.status = 'active'`,
    [paymentRecordId],
  );

  return result.affectedRows;
}
