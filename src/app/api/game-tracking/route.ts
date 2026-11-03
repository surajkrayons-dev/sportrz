import { NextRequest, NextResponse } from 'next/server';
import { getPool, parseJson } from '@/lib/mysql';
import { GAME_CATEGORIES_SQL } from '@/lib/game-utils';
import { getCurrentUser } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

    const [rows] = await getPool().execute<any[]>(
      `SELECT g.id AS game_id, g.name AS game_name,
              ${GAME_CATEGORIES_SQL} AS categories,
              g.thumbnail, recent.played_at
       FROM (
         SELECT game_id, MAX(played_at) AS played_at
         FROM game_play_history WHERE user_id = ? GROUP BY game_id
       ) recent
       INNER JOIN games g ON g.id = recent.game_id
       ORDER BY recent.played_at DESC LIMIT 10`,
      [user.uid],
    );
    return NextResponse.json(rows.map((row) => ({
      gameId: row.game_id,
      gameName: row.game_name,
      playedAt: new Date(row.played_at).toISOString(),
      categories: parseJson<string[]>(row.categories, []),
      thumbnail: row.thumbnail || undefined,
    })));
  } catch (error) {
    console.error('Recent games query failed:', error);
    return NextResponse.json({ error: 'Unable to load recently played games.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    const body = await request.json();
    const gameId = String(body.gameId || '').trim();
    if (!gameId) return NextResponse.json({ error: 'Game ID is required.' }, { status: 400 });

    const [games] = await getPool().execute<any[]>(
      'SELECT id FROM games WHERE id = ? AND is_active = 1 LIMIT 1',
      [gameId],
    );
    if (!games[0]) return NextResponse.json({ error: 'Game not found.' }, { status: 404 });

    await getPool().execute(
      'INSERT INTO game_play_history (user_id, game_id, played_at) VALUES (?, ?, UTC_TIMESTAMP())',
      [user.uid, gameId],
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Game tracking failed:', error);
    return NextResponse.json({ error: 'Unable to save game history.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    const gameId = request.nextUrl.searchParams.get('gameId');
    if (gameId) {
      await getPool().execute('DELETE FROM game_play_history WHERE user_id = ? AND game_id = ?', [user.uid, gameId]);
    } else {
      await getPool().execute('DELETE FROM game_play_history WHERE user_id = ?', [user.uid]);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Recent game removal failed:', error);
    return NextResponse.json({ error: 'Unable to update recently played games.' }, { status: 500 });
  }
}
