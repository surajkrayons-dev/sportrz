-- First-party affiliate click tracking and administrator-managed S2S postbacks.
-- Safe to re-run on MariaDB 10.4+ / MySQL 8.

ALTER TABLE affiliate_profiles
  ADD COLUMN IF NOT EXISTS postback_method ENUM('POST','GET') NOT NULL DEFAULT 'POST';

ALTER TABLE affiliate_postback_deliveries
  ADD COLUMN IF NOT EXISTS http_method ENUM('POST','GET') NOT NULL DEFAULT 'POST';

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  affiliate_user_id CHAR(36) NOT NULL,
  referral_code VARCHAR(32) NOT NULL,
  click_id VARCHAR(191) NOT NULL,
  click_source ENUM('sportrz','partner') NOT NULL DEFAULT 'sportrz',
  landing_path VARCHAR(512) DEFAULT NULL,
  referrer_host VARCHAR(255) DEFAULT NULL,
  referred_user_id CHAR(36) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_affiliate_clicks_owner_click (affiliate_user_id, click_id),
  KEY idx_affiliate_clicks_owner_created (affiliate_user_id, created_at),
  KEY idx_affiliate_clicks_referred_user (referred_user_id),
  CONSTRAINT fk_affiliate_clicks_profile FOREIGN KEY (affiliate_user_id)
    REFERENCES affiliate_profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_affiliate_clicks_referred_user FOREIGN KEY (referred_user_id)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing affiliate referral links did not create server-side click records.
-- New clicks start being tracked after this migration; historical NULL click IDs
-- are intentionally left untouched rather than inventing attribution.
