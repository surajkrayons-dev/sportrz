import type { PoolConnection, ResultSetHeader } from 'mysql2/promise';

/**
 * Creates a revenue-share commission for a captured plan purchase and queues
 * its optional S2S postback. CPC rewards are created atomically by the first-
 * party click handler and must never be duplicated by payment webhooks.
 */
export async function ensureAffiliateCommissionForPayment(
  connection: PoolConnection,
  paymentRecordId: number,
): Promise<number> {
  const [result] = await connection.execute<ResultSetHeader>(
    `INSERT IGNORE INTO affiliate_commissions
       (affiliate_user_id, referred_user_id, payment_record_id, commission_model,
        amount_paise, commission_percent, commission_paise, status)
     SELECT
        ar.affiliate_user_id,
        ar.referred_user_id,
        p.id,
        'plan_purchase',
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
      AND ap.commission_model = 'plan_purchase'
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

  // Only purchase commissions produce S2S conversion notifications.
  await connection.execute(
    `INSERT IGNORE INTO affiliate_postback_deliveries
       (affiliate_user_id, commission_id, destination_url, http_method, status)
     SELECT ac.affiliate_user_id, ac.id, ap.postback_url, COALESCE(ap.postback_method, 'POST'), 'pending'
       FROM affiliate_commissions ac
       JOIN affiliate_profiles ap ON ap.user_id = ac.affiliate_user_id
       JOIN users au ON au.id = ap.user_id
      WHERE ac.payment_record_id = ?
        AND ac.commission_model = 'plan_purchase'
        AND ap.affiliate_type = 'external_website'
        AND ap.postback_url IS NOT NULL
        AND ap.postback_url <> ''
        AND ap.status = 'active'
        AND ap.commission_model = 'plan_purchase'
        AND au.account_role = 'affiliate'
        AND au.status = 'active'`,
    [paymentRecordId],
  );

  return result.affectedRows;
}
