-- Admin-controlled affiliate commission models.
-- Existing profiles and payment commissions remain on the plan_purchase model.
-- CPC payouts are created only for valid unique first-party clicks after this migration.

ALTER TABLE affiliate_profiles
  ADD COLUMN IF NOT EXISTS commission_model ENUM('plan_purchase','pay_per_click') NOT NULL DEFAULT 'plan_purchase',
  ADD COLUMN IF NOT EXISTS click_reward_paise BIGINT UNSIGNED NOT NULL DEFAULT 0;

ALTER TABLE affiliate_clicks
  ADD COLUMN IF NOT EXISTS visitor_hash CHAR(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS billable_key CHAR(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_billable TINYINT(1) NOT NULL DEFAULT 0;

-- Create the billable-click de-duplication index only when it does not exist.
SET @affiliate_click_billable_index_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'affiliate_clicks'
     AND INDEX_NAME = 'uq_affiliate_clicks_billable_key'
);
SET @affiliate_click_billable_index_sql = IF(
  @affiliate_click_billable_index_exists = 0,
  'ALTER TABLE affiliate_clicks ADD UNIQUE KEY uq_affiliate_clicks_billable_key (billable_key)',
  'SELECT 1'
);
PREPARE affiliate_click_billable_index_stmt FROM @affiliate_click_billable_index_sql;
EXECUTE affiliate_click_billable_index_stmt;
DEALLOCATE PREPARE affiliate_click_billable_index_stmt;

-- A CPC reward is an earning event without a customer account or payment row.
-- Nullable foreign keys allow those click-ledger entries while preserving payment FKs.
ALTER TABLE affiliate_commissions
  MODIFY COLUMN referred_user_id CHAR(36) NULL DEFAULT NULL,
  MODIFY COLUMN payment_record_id BIGINT UNSIGNED NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS commission_model ENUM('plan_purchase','pay_per_click') NOT NULL DEFAULT 'plan_purchase',
  ADD COLUMN IF NOT EXISTS click_record_id BIGINT UNSIGNED DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rate_paise BIGINT UNSIGNED DEFAULT NULL;

-- One click row can create at most one click commission.
SET @affiliate_commission_click_index_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'affiliate_commissions'
     AND INDEX_NAME = 'uq_affiliate_commission_click'
);
SET @affiliate_commission_click_index_sql = IF(
  @affiliate_commission_click_index_exists = 0,
  'ALTER TABLE affiliate_commissions ADD UNIQUE KEY uq_affiliate_commission_click (click_record_id)',
  'SELECT 1'
);
PREPARE affiliate_commission_click_index_stmt FROM @affiliate_commission_click_index_sql;
EXECUTE affiliate_commission_click_index_stmt;
DEALLOCATE PREPARE affiliate_commission_click_index_stmt;

-- Never retroactively convert old purchase commissions or old analytics clicks into CPC earnings.
UPDATE affiliate_commissions
   SET commission_model = 'plan_purchase'
 WHERE payment_record_id IS NOT NULL;

UPDATE affiliate_clicks
   SET is_billable = 0
 WHERE is_billable IS NULL;
