import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool, parseJson } from '@/lib/mysql';
import { getAdminPrincipal, hasPermission } from '@/lib/admin-access';
import { logAdminAction } from '@/lib/admin-audit';
import { GAME_CATEGORIES_SQL, normalizeCategories, setGameCategories, toSlug } from '@/lib/game-utils';

export const runtime = 'nodejs';

interface GameRow extends RowDataPacket {
  id: string; name: string; slug: string; categories: unknown; path: string; thumbnail: string;
  description: string | null; display_order: number; is_active: number | boolean; is_featured: number | boolean;
}

const SELECT_FIELDS = `g.id, g.name, g.slug, ${GAME_CATEGORIES_SQL} AS categories,
  g.path, g.thumbnail, g.description, g.display_order, g.is_active, g.is_featured`;

async function authorizeAdmin() {
  const user = await getAdminPrincipal();
  return user && hasPermission(user, 'games.manage') ? user : null;
}

function mapGame(row: GameRow) {
  return {
    id: row.id,
    name: row.name,
    categories: parseJson<string[]>(row.categories, []),
    path: row.path,
    thumbnail: row.thumbnail || '',
    description: row.description || '',
    uploadOrder: Number(row.display_order || 0),
    isActive: Boolean(row.is_active),
    isFeatured: Boolean(row.is_featured),
  };
}

export async function GET() {
  try {
    if (!(await authorizeAdmin())) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    const [rows] = await getPool().execute<GameRow[]>(
      `SELECT ${SELECT_FIELDS} FROM games g ORDER BY g.display_order, g.name`,
    );
    return NextResponse.json(rows.map(mapGame));
  } catch (error) {
    console.error('Admin games query failed:', error);
    return NextResponse.json({ error: 'Unable to load game records.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await authorizeAdmin())) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    const body = await request.json();
    const id = String(body.id || '').trim();
    const name = String(body.name || '').trim();
    const path = String(body.path || '').trim();
    const thumbnail = String(body.thumbnail || '').trim();
    const categories = normalizeCategories(body.categories);
    const description = String(body.description || '').trim() || null;

    if (!id || !/^[a-zA-Z0-9_-]{1,100}$/.test(id) || !name || name.length > 191 || !path || path.length > 1024 || thumbnail.length > 1024 || !categories.length) {
      return NextResponse.json({ error: 'Valid game ID, name, path (up to 1024 characters), and at least one category are required.' }, { status: 400 });
    }

    const pool = getPool();
    const connection = await pool.getConnection();
    let uploadOrder = 0;
    const slug = toSlug(`${name}-${id}`).slice(0, 190) || id.toLowerCase();
    try {
      await connection.beginTransaction();
      const [orderRows] = await connection.execute<RowDataPacket[]>(
        'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM games',
      );
      uploadOrder = Number(orderRows[0]?.next_order || 1);
      await connection.execute(
        `INSERT INTO games (id, slug, name, path, thumbnail, description, is_active, is_featured, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, slug, name, path, thumbnail, description, body.isActive === false ? 0 : 1, body.isFeatured ? 1 : 0, uploadOrder],
      );
      await setGameCategories(id, categories, connection);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const actor = await authorizeAdmin();
    if (actor) await logAdminAction(actor.id, 'game.created', 'game', id, { name, categories, isActive: body.isActive !== false, isFeatured: Boolean(body.isFeatured) }, request);
    return NextResponse.json({
      success: true,
      game: { id, name, categories, path, thumbnail, description: description || '', uploadOrder, isActive: body.isActive !== false, isFeatured: Boolean(body.isFeatured) },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Admin game insert failed:', error);
    if (error?.code === 'ER_DUP_ENTRY') return NextResponse.json({ error: 'A game with that ID or slug already exists.' }, { status: 409 });
    return NextResponse.json({ error: 'Unable to create game.' }, { status: 500 });
  }
}
