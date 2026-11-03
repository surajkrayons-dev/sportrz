/**
 * Import/upsert a JSON game catalog into the supplied Sportrz schema.
 * Usage: npm run db:import-games -- ./exports/games.json
 * Destructive option: --clear removes existing games and dependent play/catalog links.
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

function toSlug(value) {
  return String(value).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 150);
}

function readGames(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Game JSON file not found: ${filePath}. Export the game catalog as JSON first.`);
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const entries = Array.isArray(parsed)
    ? parsed
    : Object.entries(parsed || {}).map(([id, game]) => ({ id, ...(game || {}) }));
  return entries.map((game, index) => ({
    id: String(game.id || '').trim(),
    name: String(game.name || '').trim(),
    slug: String(game.slug || '').trim(),
    categories: Array.isArray(game.categories)
      ? game.categories.map(String).map((value) => value.trim()).filter(Boolean)
      : [String(game.categories || '').trim()].filter(Boolean),
    path: String(game.path || '').trim(),
    thumbnail: String(game.thumbnail || '').trim(),
    description: game.description ? String(game.description) : null,
    displayOrder: Number.isFinite(Number(game.displayOrder ?? game.uploadOrder)) ? Number(game.displayOrder ?? game.uploadOrder) : index + 1,
    isActive: game.isActive === false ? 0 : 1,
    isFeatured: game.isFeatured === true ? 1 : 0,
  }));
}

async function ensureCategory(connection, name) {
  const cleanName = String(name).trim().slice(0, 100);
  const [named] = await connection.execute('SELECT id FROM categories WHERE name = ? LIMIT 1', [cleanName]);
  if (named.length) return Number(named[0].id);

  const baseSlug = toSlug(cleanName) || 'category';
  let slug = baseSlug;
  const [slugRows] = await connection.execute('SELECT id, name FROM categories WHERE slug = ? LIMIT 1', [slug]);
  if (slugRows.length && slugRows[0].name !== cleanName) slug = `${baseSlug}-${Date.now().toString(36)}`.slice(0, 120);

  await connection.execute(
    `INSERT INTO categories (name, slug, display_order, is_active) VALUES (?, ?, 0, 1)
     ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    [cleanName, slug],
  );
  const [created] = await connection.execute('SELECT id FROM categories WHERE name = ? LIMIT 1', [cleanName]);
  if (!created.length) throw new Error(`Unable to create/find category: ${cleanName}`);
  return Number(created[0].id);
}

async function main() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');
  const fileArg = args.find((arg) => !arg.startsWith('--'));
  const filePath = path.resolve(process.cwd(), fileArg || 'src/lib/games.json');
  const games = readGames(filePath);
  if (!games.length) throw new Error('No games were found in the selected JSON file.');

  for (const game of games) {
    if (!game.id || !/^[a-zA-Z0-9_-]{1,100}$/.test(game.id) || !game.name || game.name.length > 191 || !game.path || game.path.length > 1024 || game.thumbnail.length > 1024 || game.categories.length === 0) {
      throw new Error(`Invalid game record. Each game needs a valid id, name, path and at least one category. Bad record: ${JSON.stringify(game)}`);
    }
  }

  const databaseUrl = process.env.DATABASE_URL;
  let connectionOptions;
  if (databaseUrl) {
    const parsed = new URL(databaseUrl);
    connectionOptions = {
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ''),
    };
  } else {
    connectionOptions = {
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE,
    };
  }
  if (!connectionOptions.host || !connectionOptions.user || !connectionOptions.database) {
    throw new Error('MySQL is not configured. Copy .env.example to .env.local and set the database credentials.');
  }

  const connection = await mysql.createConnection({ ...connectionOptions, charset: 'utf8mb4', timezone: 'Z' });
  try {
    const [tables] = await connection.query("SHOW TABLES LIKE 'game_categories'");
    if (!tables.length) throw new Error('The selected database does not contain the supplied Sportrz schema (game_categories is missing).');

    if (shouldClear) {
      console.warn('WARNING: --clear will delete games and related play history/category/plan links.');
      await connection.beginTransaction();
      try {
        await connection.execute('DELETE FROM games');
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }

    await connection.beginTransaction();
    try {
      for (const [index, game] of games.entries()) {
        const slug = (game.slug ? toSlug(game.slug) : toSlug(`${game.name}-${game.id}`)).slice(0, 190) || game.id.toLowerCase();
        await connection.execute(
          `INSERT INTO games (id, name, slug, path, thumbnail, description, is_active, is_featured, display_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), slug = VALUES(slug), path = VALUES(path),
             thumbnail = VALUES(thumbnail), description = VALUES(description), is_active = VALUES(is_active),
             is_featured = VALUES(is_featured), display_order = VALUES(display_order), updated_at = UTC_TIMESTAMP()`,
          [game.id, game.name, slug, game.path, game.thumbnail, game.description, game.isActive, game.isFeatured, game.displayOrder || index + 1],
        );

        const categoryIds = [];
        for (const categoryName of game.categories) categoryIds.push(await ensureCategory(connection, categoryName));
        await connection.execute('DELETE FROM game_categories WHERE game_id = ?', [game.id]);
        for (const categoryId of categoryIds) {
          await connection.execute(
            'INSERT INTO game_categories (game_id, category_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE category_id = VALUES(category_id)',
            [game.id, categoryId],
          );
        }
        console.log(`Imported ${index + 1}/${games.length}: ${game.name} (${game.id})`);
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }
    console.log(`Finished importing ${games.length} games into ${connectionOptions.database}.`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Game import failed:', error.message || error);
  process.exitCode = 1;
});
