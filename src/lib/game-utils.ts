import type { Pool, Connection, RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';

type DbExecutor = Pool | Connection;

export function normalizeCategories(value: unknown): string[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return Array.from(new Set(values.map((item) => String(item).trim()).filter(Boolean)));
}

export function toSlug(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 150);
}

export async function ensureCategory(name: string, executor: DbExecutor = getPool()): Promise<number> {
  const cleanName = name.trim().slice(0, 100);
  if (!cleanName) throw new Error('Category name cannot be empty.');

  const [named] = await executor.execute<RowDataPacket[]>(
    'SELECT id FROM categories WHERE name = ? LIMIT 1',
    [cleanName],
  );
  if (named.length) return Number(named[0].id);

  const baseSlug = toSlug(cleanName) || 'category';
  let slug = baseSlug;
  const [slugRows] = await executor.execute<RowDataPacket[]>(
    'SELECT id, name FROM categories WHERE slug = ? LIMIT 1',
    [slug],
  );
  if (slugRows.length && slugRows[0].name !== cleanName) {
    slug = `${baseSlug}-${Date.now().toString(36)}`.slice(0, 120);
  }

  await executor.execute(
    `INSERT INTO categories (name, slug, display_order, is_active)
     VALUES (?, ?, 0, 1)
     ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    [cleanName, slug],
  );
  const [created] = await executor.execute<RowDataPacket[]>(
    'SELECT id FROM categories WHERE name = ? LIMIT 1',
    [cleanName],
  );
  if (!created.length) throw new Error(`Unable to resolve category: ${cleanName}`);
  return Number(created[0].id);
}

export async function upsertCategories(categories: string[], executor: DbExecutor = getPool()): Promise<number[]> {
  const ids: number[] = [];
  for (const categoryName of normalizeCategories(categories)) {
    ids.push(await ensureCategory(categoryName, executor));
  }
  return ids;
}

export async function setGameCategories(gameId: string, categories: string[], executor: DbExecutor = getPool()): Promise<void> {
  const categoryIds = await upsertCategories(categories, executor);
  await executor.execute('DELETE FROM game_categories WHERE game_id = ?', [gameId]);
  for (const categoryId of categoryIds) {
    await executor.execute(
      'INSERT INTO game_categories (game_id, category_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE category_id = VALUES(category_id)',
      [gameId, categoryId],
    );
  }
}

// Compatible with MariaDB 10.4 as well as newer MariaDB/MySQL versions.
// JSON_ARRAYAGG is only available in MariaDB 10.5+, so build a JSON array
// from JSON_QUOTE + GROUP_CONCAT for local XAMPP installations on 10.4.
export const GAME_CATEGORIES_SQL = `CONCAT('[', COALESCE((
  SELECT GROUP_CONCAT(JSON_QUOTE(c.name) ORDER BY c.name SEPARATOR ',')
  FROM game_categories gc
  INNER JOIN categories c ON c.id = gc.category_id
  WHERE gc.game_id = g.id AND c.is_active = 1
), ''), ']')`;
