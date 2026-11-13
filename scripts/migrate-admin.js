'use strict';

const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

const projectRoot = process.cwd();
dotenv.config({ path: path.join(projectRoot, '.env.local') });
dotenv.config({ path: path.join(projectRoot, '.env') });

async function main() {
  const migrationPaths = [
    path.join(projectRoot, 'database', 'migrations', '20261028_admin_affiliate_portal.sql'),
    path.join(projectRoot, 'database', 'migrations', '20261029_external_affiliate_program.sql'),
    path.join(projectRoot, 'database', 'migrations', '20261109_affiliate_postback_and_ledger.sql'),
    path.join(projectRoot, 'database', 'migrations', '20261110_affiliate_click_tracking_s2s_admin.sql'),
  ];
  for (const migrationPath of migrationPaths) {
    if (!fs.existsSync(migrationPath)) throw new Error(`Migration file not found: ${migrationPath}`);
  }
  const databaseUrl = process.env.DATABASE_URL;
  const databaseOptions = databaseUrl
    ? (() => {
        const parsed = new URL(databaseUrl);
        return {
          host: parsed.hostname,
          port: Number(parsed.port || 3306),
          user: decodeURIComponent(parsed.username),
          password: decodeURIComponent(parsed.password),
          database: parsed.pathname.replace(/^\//, ''),
        };
      })()
    : {
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'astrotri_sportrz',
      };
  if (!databaseOptions.host || !databaseOptions.user || !databaseOptions.database) {
    throw new Error('Missing database settings. Configure DATABASE_URL or MYSQL_HOST, MYSQL_USER, and MYSQL_DATABASE in .env.local.');
  }
  const pool = mysql.createPool({
    ...databaseOptions,
    waitForConnections: true,
    connectionLimit: 1,
    multipleStatements: true,
    connectTimeout: 10000,
    charset: 'utf8mb4',
    ...(process.env.MYSQL_SSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {}),
  });

  try {
    const connection = await pool.getConnection();
    try {
      console.log(`Applying admin, affiliate, click-tracking, and S2S postback migrations to ${databaseOptions.database}…`);
      for (const migrationPath of migrationPaths) {
        console.log(`Applying ${path.basename(migrationPath)}…`);
        await connection.query(fs.readFileSync(migrationPath, 'utf8'));
      }
      console.log('Admin, affiliate, click-tracking, and S2S postback migrations completed.');
    } finally {
      connection.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Admin migration failed:', error.message || error);
  process.exitCode = 1;
});
