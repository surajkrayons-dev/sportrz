import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool, parseJson } from '@/lib/mysql';
import { getCurrentUser } from '@/lib/session';
import { GAME_CATEGORIES_SQL, toSlug } from '@/lib/game-utils';

export const runtime = 'nodejs';

interface GameRow extends RowDataPacket {
  id: string;
  name: string;
  slug: string;
  categories: unknown;
  path: string;
  thumbnail: string;
  description: string | null;
  display_order: number;
  is_featured?: number | boolean;
}

const SELECT_FIELDS = `g.id, g.name, g.slug, ${GAME_CATEGORIES_SQL} AS categories,
  g.path, g.thumbnail, g.description, g.display_order, g.is_featured`;

function mapGame(row: GameRow, includePath = false) {
  return {
    id: row.id,
    name: row.name,
    categories: parseJson<string[]>(row.categories, []),
    path: includePath ? row.path : '',
    thumbnail: row.thumbnail || '',
    description: row.description || '',
    uploadOrder: Number(row.display_order || 0),
    isFeatured: Boolean(row.is_featured),
  };
}

export async function GET(request: NextRequest) {
  try {
    const gameId = request.nextUrl.searchParams.get('id');
    const category = request.nextUrl.searchParams.get('category')?.trim();
    const pool = getPool();
    let rows: GameRow[];

    if (gameId) {
      // Require a signed-in user to load a single game. Affiliate accounts are not full admins.
      const user = await getCurrentUser();
      if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
      const isInternalAdmin = user.accountRole === 'super_admin' || user.accountRole === 'subadmin';
      if (!isInternalAdmin) {
        const [activeSubscriptions] = await pool.execute<Array<RowDataPacket & { plan_id: number; game_access_mode: string }>>(
          `SELECT pl.id AS plan_id, pl.game_access_mode
           FROM subscriptions s JOIN plans pl ON pl.id = s.plan_id
           WHERE s.user_id = ? AND s.status = 'active' AND (s.end_at IS NULL OR s.end_at > UTC_TIMESTAMP())
           ORDER BY s.created_at DESC LIMIT 1`, [user.uid],
        );
        const entitlement = activeSubscriptions[0];
        if (entitlement?.game_access_mode === 'none') {
          return NextResponse.json({ error: 'Your current plan does not include game access.', code: 'PLAN_GAME_ACCESS_DENIED' }, { status: 403 });
        }
        if (entitlement?.game_access_mode === 'selected') {
          const [allowed] = await pool.execute<RowDataPacket[]>(
            'SELECT game_id FROM plan_games WHERE plan_id = ? AND game_id = ? LIMIT 1', [entitlement.plan_id, gameId],
          );
          if (!allowed.length) return NextResponse.json({ error: 'This game is not included in your current plan. Choose a plan that includes this game.', code: 'PLAN_GAME_ACCESS_DENIED' }, { status: 403 });
        }
        // Users without an active subscription still get the existing limited trial UI.
      }
      const [result] = await pool.execute<GameRow[]>(
        `SELECT ${SELECT_FIELDS} FROM games g WHERE g.id = ? AND g.is_active = 1 LIMIT 1`,
        [gameId],
      );
      rows = result;
    } else if (category) {
      const normalizedSlug = toSlug(category);
      const [result] = await pool.execute<GameRow[]>(
        `SELECT ${SELECT_FIELDS}
           FROM games g
          WHERE g.is_active = 1 AND EXISTS (
            SELECT 1 FROM game_categories gc
            INNER JOIN categories c ON c.id = gc.category_id
            WHERE gc.game_id = g.id AND c.is_active = 1
              AND (LOWER(c.name) = LOWER(?) OR c.slug = ?)
          )
          ORDER BY g.display_order, g.name`,
        [category, normalizedSlug],
      );
      rows = result;
    } else {
      const [result] = await pool.execute<GameRow[]>(
        `SELECT ${SELECT_FIELDS} FROM games g WHERE g.is_active = 1 ORDER BY g.display_order, g.name`,
      );
      rows = result;
    }

    const games = gameId ? rows.map((row) => mapGame(row, true)) : rows.map((row) => mapGame(row, false));
    if (gameId) return games.length ? NextResponse.json(games[0]) : NextResponse.json({ error: 'Game not found' }, { status: 404 });
    return NextResponse.json(games);
  } catch (error) {
    console.error('MySQL games query failed:', error);
    return NextResponse.json({ error: 'Unable to load games. Check the MySQL connection and schema.' }, { status: 500 });
  }
}
