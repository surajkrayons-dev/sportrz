-- External website affiliate support. Safe to re-run on MariaDB 10.4+ / MySQL 8.
ALTER TABLE affiliate_profiles
  ADD COLUMN IF NOT EXISTS affiliate_type ENUM('admin_created','external_website') NOT NULL DEFAULT 'admin_created',
  ADD COLUMN IF NOT EXISTS website_url VARCHAR(512) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS affiliate_applications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id CHAR(36) NOT NULL,
  website_url VARCHAR(512) NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  review_note VARCHAR(512) DEFAULT NULL,
  reviewed_by_admin_id CHAR(36) DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_affiliate_applications_user (user_id),
  KEY idx_affiliate_applications_status_created (status, created_at),
  CONSTRAINT fk_affiliate_applications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_affiliate_applications_reviewer FOREIGN KEY (reviewed_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
