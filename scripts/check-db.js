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
    const adminTables = [
      'admin_user_permissions',
      'affiliate_profiles',
      'affiliate_referrals',
      'affiliate_commissions',
      'affiliate_applications',
      'affiliate_clicks',
      'affiliate_postback_deliveries',
    ];
    const missingAdmin = [];
    for (const table of adminTables) {
      const [result] = await connection.query('SHOW TABLES LIKE ?', [table]);
      if (!result.length) missingAdmin.push(table);
    }

    const requiredColumns = [
      ['users', 'account_role'],
      ['affiliate_profiles', 'affiliate_type'],
      ['affiliate_profiles', 'website_url'],
      ['affiliate_profiles', 'postback_url'],
      ['affiliate_profiles', 'postback_method'],
      ['affiliate_referrals', 'click_id'],
      ['affiliate_postback_deliveries', 'http_method'],
    ];
    const missingColumns = [];
    for (const [table, column] of requiredColumns) {
      if (missingAdmin.includes(table)) continue;
      const [result] = await connection.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
      if (!result.length) missingColumns.push(`${table}.${column}`);
    }

    if (missingAdmin.length || missingColumns.length) {
      console.log('Admin / affiliate S2S schema is incomplete. Run: npm run db:migrate:admin');
      if (missingAdmin.length) console.log('Missing admin tables:', missingAdmin.join(', '));
      if (missingColumns.length) console.log('Missing columns:', missingColumns.join(', '));
    } else {
      console.log('Admin, affiliate, first-party Click ID, and S2S postback schema verified.');
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
