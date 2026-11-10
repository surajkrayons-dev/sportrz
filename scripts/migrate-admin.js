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
  ];
  for (const migrationPath of migrationPaths) {
    if (!fs.existsSync(migrationPath)) throw new Error(`Migration file not found: ${migrationPath}`);
  }
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'astrotri_sportrz',
    waitForConnections: true,
    connectionLimit: 1,
    multipleStatements: true,
    connectTimeout: 10000,
  });

  try {
    const connection = await pool.getConnection();
    try {
      console.log(`Applying admin, affiliate, and external-website affiliate migrations to ${process.env.MYSQL_DATABASE || 'astrotri_sportrz'}…`);
      for (const migrationPath of migrationPaths) {
        console.log(`Applying ${path.basename(migrationPath)}…`);
        await connection.query(fs.readFileSync(migrationPath, 'utf8'));
      }
      console.log('Admin and affiliate schema migrations completed.');
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
