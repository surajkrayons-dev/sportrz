-- Sportrz admin, sub-admin, and affiliate portal extensions.
-- Run once against the existing astrotri_sportrz database before using the new admin APIs.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_role ENUM('user','super_admin','subadmin','affiliate') NOT NULL DEFAULT 'user';

UPDATE users
   SET account_role = 'super_admin'
 WHERE is_admin = 1 AND account_role = 'user';

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS assigned_by_admin_id CHAR(36) DEFAULT NULL;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE subscriptions
  MODIFY COLUMN source VARCHAR(32) NOT NULL DEFAULT 'purchase';

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS admin_user_permissions (
  user_id CHAR(36) NOT NULL,
  permission_key VARCHAR(80) NOT NULL,
  granted_by_user_id CHAR(36) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_key),
  KEY idx_admin_permissions_key (permission_key),
  CONSTRAINT fk_admin_permissions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_permissions_granted_by FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS affiliate_profiles (
  user_id CHAR(36) NOT NULL,
  referral_code VARCHAR(32) NOT NULL,
  commission_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  payout_email VARCHAR(191) DEFAULT NULL,
  status ENUM('active','paused') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_affiliate_referral_code (referral_code),
  KEY idx_affiliate_status_created (status, created_at),
  CONSTRAINT fk_affiliate_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  affiliate_user_id CHAR(36) NOT NULL,
  referred_user_id CHAR(36) NOT NULL,
  referral_code VARCHAR(32) NOT NULL,
  source ENUM('link','manual') NOT NULL DEFAULT 'link',
  status ENUM('qualified','rejected') NOT NULL DEFAULT 'qualified',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_affiliate_referred_user (referred_user_id),
  KEY idx_affiliate_referrals_affiliate_created (affiliate_user_id, created_at),
  CONSTRAINT fk_affiliate_referrals_affiliate FOREIGN KEY (affiliate_user_id) REFERENCES affiliate_profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_affiliate_referrals_referred FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  affiliate_user_id CHAR(36) NOT NULL,
  referred_user_id CHAR(36) NOT NULL,
  payment_record_id BIGINT UNSIGNED NOT NULL,
  amount_paise BIGINT UNSIGNED NOT NULL,
  commission_percent DECIMAL(5,2) NOT NULL,
  commission_paise BIGINT UNSIGNED NOT NULL,
  status ENUM('pending','approved','paid','reversed') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_affiliate_commission_payment (payment_record_id),
  KEY idx_affiliate_commissions_affiliate_status (affiliate_user_id, status),
  CONSTRAINT fk_affiliate_commission_affiliate FOREIGN KEY (affiliate_user_id) REFERENCES affiliate_profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_affiliate_commission_referred FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_affiliate_commission_payment FOREIGN KEY (payment_record_id) REFERENCES payments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO site_settings (setting_key, setting_value, value_type)
VALUES
  ('site_name', 'Sportrz', 'string'),
  ('support_email', 'support@backend.sportrz.com', 'string'),
  ('maintenance_mode', 'false', 'boolean'),
  ('registration_enabled', 'true', 'boolean')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

-- Do not enable paid plans automatically. The super admin should review prices and activate them in Admin > Plans.
