import mysql, { type Pool, type PoolOptions } from 'mysql2/promise';

type DatabaseGlobals = typeof globalThis & { __sportrzMysqlPool?: Pool };
const globals = globalThis as DatabaseGlobals;

function getDatabaseOptions(): PoolOptions {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    const parsed = new URL(databaseUrl);
    const options: PoolOptions = {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 3306,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ''),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      decimalNumbers: true,
      timezone: 'Z',
      enableKeepAlive: true,
    };

    if (parsed.searchParams.get('ssl') === 'true') {
      options.ssl = { rejectUnauthorized: true };
    }

    return options;
  }

  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const database = process.env.MYSQL_DATABASE;
  if (!host || !user || !database) {
    throw new Error(
      'MySQL is not configured. Set DATABASE_URL or MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, and MYSQL_PORT in .env.local.'
    );
  }

  return {
    host,
    port: Number(process.env.MYSQL_PORT || 3306),
    user,
    password: process.env.MYSQL_PASSWORD || '',
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true,
    timezone: 'Z',
    enableKeepAlive: true,
    ...(process.env.MYSQL_SSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {}),
  };
}

export function getPool(): Pool {
  if (!globals.__sportrzMysqlPool) {
    globals.__sportrzMysqlPool = mysql.createPool(getDatabaseOptions());
  }
  return globals.__sportrzMysqlPool;
}

export async function checkDatabaseConnection(): Promise<void> {
  const connection = await getPool().getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
