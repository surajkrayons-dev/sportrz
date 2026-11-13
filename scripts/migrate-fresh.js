// WARNING: This is destructive. It rebuilds the Sportrz schema and leaves every table empty.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

const projectRoot = process.cwd();
dotenv.config({ path: path.join(projectRoot, '.env.local') });
dotenv.config({ path: path.join(projectRoot, '.env') });

const quoteIdentifier = (value) => '`' + String(value).replace(/`/g, '``') + '`';

async function main() {
  const databaseName = process.env.MYSQL_DATABASE;
  if (!databaseName) {
    throw new Error('MYSQL_DATABASE is missing. Set it in .env.local before running this command.');
  }

  const schemaPath = path.join(projectRoot, 'database', 'schema.sql');
  const migrationPaths = [
    path.join(projectRoot, 'database', 'migrations', '20261028_admin_affiliate_portal.sql'),
    path.join(projectRoot, 'database', 'migrations', '20261029_external_affiliate_program.sql'),
    path.join(projectRoot, 'database', 'migrations', '20261109_affiliate_postback_and_ledger.sql'),
    path.join(projectRoot, 'database', 'migrations', '20261110_affiliate_click_tracking_s2s_admin.sql'),
    path.join(projectRoot, 'database', 'migrations', '20261113_affiliate_commission_models.sql'),
  ];

  if (!fs.existsSync(schemaPath)) throw new Error(`Base schema file not found: ${schemaPath}`);
  for (const migrationPath of migrationPaths) {
    if (!fs.existsSync(migrationPath)) throw new Error(`Migration file not found: ${migrationPath}`);
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  stdout.write('\n============================================================\n');
  stdout.write(' DANGER: FULL SPORTRZ DATABASE RESET\n');
  stdout.write('============================================================\n');
  stdout.write(`Target database: ${databaseName}\n`);
  stdout.write('This will DROP and recreate all tables, then EMPTY every table.\n');
  stdout.write('All users/admins, games, categories, plans, payments, orders,\n');
  stdout.write('subscriptions, affiliate records, settings and logs will be lost.\n');
  stdout.write('The database structure and latest affiliate migrations will remain.\n\n');

  const confirmation = (await rl.question(`Type exactly "${databaseName}" to continue: `)).trim();
  rl.close();
  if (confirmation !== databaseName) {
    stdout.write('Cancelled. No database changes were made.\n');
    return;
  }

  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: databaseName,
    waitForConnections: true,
    connectionLimit: 1,
    multipleStatements: true,
    connectTimeout: 10000,
  });

  let connection;
  let foreignKeyChecksDisabled = false;
  try {
    connection = await pool.getConnection();
    const [[dbRow]] = await connection.query('SELECT DATABASE() AS database_name');
    if (!dbRow || dbRow.database_name !== databaseName) {
      throw new Error(`Connected to unexpected database: ${dbRow?.database_name || 'unknown'}`);
    }

    stdout.write(`\nConnected to ${dbRow.database_name}. Starting fresh rebuild...\n`);
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    foreignKeyChecksDisabled = true;

    const [existingObjects] = await connection.query(
      `SELECT TABLE_NAME, TABLE_TYPE
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?`,
      [databaseName],
    );

    for (const object of existingObjects.filter((item) => item.TABLE_TYPE === 'VIEW')) {
      await connection.query(`DROP VIEW IF EXISTS ${quoteIdentifier(object.TABLE_NAME)}`);
    }
    for (const object of existingObjects.filter((item) => item.TABLE_TYPE === 'BASE TABLE')) {
      await connection.query(`DROP TABLE IF EXISTS ${quoteIdentifier(object.TABLE_NAME)}`);
    }
    stdout.write(`Dropped ${existingObjects.length} existing database objects.\n`);

    stdout.write('Creating base tables from database/schema.sql...\n');
    await connection.query(fs.readFileSync(schemaPath, 'utf8'));

    for (const migrationPath of migrationPaths) {
      stdout.write(`Applying ${path.basename(migrationPath)}...\n`);
      await connection.query(fs.readFileSync(migrationPath, 'utf8'));
    }

    // The base schema and migrations contain starter/default rows.
    // Clear them only after the complete schema has been recreated.
    const [tables] = await connection.query(
      `SELECT TABLE_NAME
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
      [databaseName],
    );

    for (const table of tables) {
      await connection.query(`TRUNCATE TABLE ${quoteIdentifier(table.TABLE_NAME)}`);
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    foreignKeyChecksDisabled = false;

    stdout.write('\nSUCCESS: Sportrz schema rebuilt and all tables are empty.\n');
    stdout.write(`Total tables created and cleared: ${tables.length}\n`);
    stdout.write('Next: create/register a new admin user and re-add games, categories and plans.\n');
  } finally {
    if (connection && foreignKeyChecksDisabled) {
      try { await connection.query('SET FOREIGN_KEY_CHECKS = 1'); } catch { /* preserve the original error */ }
    }
    if (connection) connection.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Fresh migration failed:', error.message || error);
  process.exitCode = 1;
});
