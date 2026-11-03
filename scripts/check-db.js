require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  let options;
  if (databaseUrl) {
    const parsed = new URL(databaseUrl);
    options = {
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ''),
    };
  } else {
    options = {
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE,
    };
  }
  if (!options.host || !options.user || !options.database) {
    throw new Error('Missing MySQL settings. Copy .env.example to .env.local and fill in the credentials.');
  }
  if ((options.password || '').includes('PUT_YOUR_REAL_MYSQL_PASSWORD_HERE')) {
    throw new Error('Replace MYSQL_PASSWORD with the real database password in .env.local.');
  }

  const connection = await mysql.createConnection({ ...options, connectTimeout: 10000 });
  try {
    const [rows] = await connection.query('SELECT DATABASE() AS database_name, VERSION() AS mysql_version');
    console.log('MySQL connection successful:', rows[0]);
    const requiredTables = [
      'users', 'auth_tokens', 'categories', 'games', 'game_categories', 'game_play_history',
      'notifications', 'oauth_accounts', 'payments', 'plans', 'subscriptions', 'contact_messages', 'feedback',
    ];
    const missing = [];
    for (const table of requiredTables) {
      const [result] = await connection.query('SHOW TABLES LIKE ?', [table]);
      if (!result.length) missing.push(table);
    }
    if (missing.length) {
      throw new Error(`Connected to the database, but the Sportrz schema is incomplete. Missing tables: ${missing.join(', ')}`);
    }
    console.log(`Sportrz schema verified: all ${requiredTables.length} required tables exist.`);
    const adminTables = ['admin_user_permissions', 'affiliate_profiles', 'affiliate_referrals', 'affiliate_commissions', 'affiliate_applications'];
    const missingAdmin = [];
    for (const table of adminTables) {
      const [result] = await connection.query('SHOW TABLES LIKE ?', [table]);
      if (!result.length) missingAdmin.push(table);
    }
    const [roleColumns] = await connection.query("SHOW COLUMNS FROM users LIKE 'account_role'");
    const [affiliateTypeColumns] = await connection.query("SHOW COLUMNS FROM affiliate_profiles LIKE 'affiliate_type'").catch(() => [[]]);
    const [websiteUrlColumns] = await connection.query("SHOW COLUMNS FROM affiliate_profiles LIKE 'website_url'").catch(() => [[]]);
    if (!roleColumns.length || missingAdmin.length || !affiliateTypeColumns.length || !websiteUrlColumns.length) {
      console.log('Admin extensions are not fully installed. Run: npm run db:migrate:admin');
      if (missingAdmin.length) console.log('Missing admin tables:', missingAdmin.join(', '));
    } else {
      console.log('Admin / sub-admin / affiliate schema verified.');
    }
    const [counts] = await connection.query('SELECT (SELECT COUNT(*) FROM games) AS games, (SELECT COUNT(*) FROM categories WHERE is_active = 1) AS categories');
    console.log('Existing catalog:', counts[0]);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('MySQL check failed:', error.message || error);
  process.exitCode = 1;
});
