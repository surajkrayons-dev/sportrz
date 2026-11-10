-- External affiliate click attribution, secure conversion postbacks, and retry ledger.
-- Safe to re-run on MariaDB 10.4+ / MySQL 8.

ALTER TABLE affiliate_referrals
  ADD COLUMN IF NOT EXISTS click_id VARCHAR(191) DEFAULT NULL;

ALTER TABLE affiliate_profiles
  ADD COLUMN IF NOT EXISTS postback_url VARCHAR(1000) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS affiliate_postback_deliveries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  affiliate_user_id CHAR(36) NOT NULL,
  commission_id BIGINT UNSIGNED NOT NULL,
  destination_url VARCHAR(1000) NOT NULL,
  status ENUM('pending','sending','sent','failed') NOT NULL DEFAULT 'pending',
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  http_status SMALLINT UNSIGNED DEFAULT NULL,
  response_excerpt VARCHAR(500) DEFAULT NULL,
  last_error VARCHAR(500) DEFAULT NULL,
  last_attempt_at DATETIME DEFAULT NULL,
  sent_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_affiliate_postback_commission (commission_id),
  KEY idx_affiliate_postback_status_attempt (status, last_attempt_at),
  KEY idx_affiliate_postback_affiliate_created (affiliate_user_id, created_at),
  CONSTRAINT fk_affiliate_postback_profile FOREIGN KEY (affiliate_user_id) REFERENCES affiliate_profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_affiliate_postback_commission FOREIGN KEY (commission_id) REFERENCES affiliate_commissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill commissions for historical captured orders that already belong to
-- a qualified affiliate referral. The unique payment key keeps this idempotent.
INSERT IGNORE INTO affiliate_commissions
  (affiliate_user_id, referred_user_id, payment_record_id,
   amount_paise, commission_percent, commission_paise, status)
SELECT ar.affiliate_user_id,
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
 WHERE p.provider = 'razorpay'
   AND p.status = 'captured';

-- Also queue any existing ledger entries if this migration is re-run after a
-- partner has configured a postback URL.
INSERT IGNORE INTO affiliate_postback_deliveries
  (affiliate_user_id, commission_id, destination_url, status)
SELECT ac.affiliate_user_id, ac.id, ap.postback_url, 'pending'
  FROM affiliate_commissions ac
  JOIN affiliate_profiles ap ON ap.user_id = ac.affiliate_user_id
  JOIN users au ON au.id = ap.user_id
 WHERE ap.affiliate_type = 'external_website'
   AND ap.postback_url IS NOT NULL
   AND ap.postback_url <> ''
   AND ap.status = 'active'
   AND au.account_role = 'affiliate'
   AND au.status = 'active';
