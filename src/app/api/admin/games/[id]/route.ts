import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import { getAdminPrincipal, hasPermission } from '@/lib/admin-access';
import { logAdminAction } from '@/lib/admin-audit';
import { normalizeCategories, setGameCategories, toSlug } from '@/lib/game-utils';

export const runtime = 'nodejs';
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAdminPrincipal();
    if (!user || !hasPermission(user, 'games.manage')) return NextResponse.json({ error: 'Game management access required.' }, { status: 403 });
    const { id: oldId } = await context.params;
    const body = await request.json();
    const id = String(body.id || oldId).trim();
    const name = String(body.name || '').trim();
    const path = String(body.path || '').trim();
    const thumbnail = String(body.thumbnail || '').trim();
    const description = String(body.description || '').trim() || null;
    const categories = normalizeCategories(body.categories);

    if (!oldId || !id || !/^[a-zA-Z0-9_-]{1,100}$/.test(id) || !name || name.length > 191 || !path || path.length > 1024 || thumbnail.length > 1024 || !categories.length) {
      return NextResponse.json({ error: 'Valid game ID, name, path, and at least one category are required.' }, { status: 400 });
    }

    const pool = getPool();
    const connection = await pool.getConnection();
    const slug = toSlug(`${name}-${id}`).slice(0, 190) || id.toLowerCase();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute<any[]>(
        'SELECT id, is_active, is_featured FROM games WHERE id = ? LIMIT 1 FOR UPDATE', [oldId],
      );
      if (!rows.length) {
        await connection.rollback();
        return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
      }

      if (id !== oldId) {
        const [existing] = await connection.execute<any[]>('SELECT id FROM games WHERE id = ? OR slug = ? LIMIT 1', [id, slug]);
        if (existing.length) {
          await connection.rollback();
          return NextResponse.json({ error: `A game with ID "${id}" or its slug already exists.` }, { status: 409 });
        }
        await connection.execute(
          `INSERT INTO games (id, slug, name, path, thumbnail, description, is_active, is_featured, display_order)
           SELECT ?, ?, ?, ?, ?, ?, is_active, is_featured, display_order FROM games WHERE id = ?`,
          [id, slug, name, path, thumbnail, description, oldId],
        );
        await connection.execute('UPDATE game_categories SET game_id = ? WHERE game_id = ?', [id, oldId]);
        await connection.execute('UPDATE game_play_history SET game_id = ? WHERE game_id = ?', [id, oldId]);
        await connection.execute('UPDATE plan_games SET game_id = ? WHERE game_id = ?', [id, oldId]);
        await connection.execute('UPDATE reviews SET game_id = ? WHERE game_id = ?', [id, oldId]);
        await connection.execute('DELETE FROM games WHERE id = ?', [oldId]);
      } else {
        await connection.execute(
          `UPDATE games SET slug = ?, name = ?, path = ?, thumbnail = ?, description = ?, updated_at = UTC_TIMESTAMP()
           WHERE id = ?`,
          [slug, name, path, thumbnail, description, oldId],
        );
      }

      await connection.execute(
        'UPDATE games SET is_active = ?, is_featured = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?',
        [body.isActive === undefined ? Number(rows[0].is_active) : (body.isActive ? 1 : 0), body.isFeatured === undefined ? Number(rows[0].is_featured) : (body.isFeatured ? 1 : 0), id],
      );
      await setGameCategories(id, categories, connection);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await logAdminAction(user.id, 'game.updated', 'game', id, { previousId: oldId, name, categories, isActive: body.isActive, isFeatured: body.isFeatured }, request);
    return NextResponse.json({ success: true, game: { id, name, categories, path, thumbnail, description: description || '' } });
  } catch (error: any) {
    console.error('Admin game update failed:', error);
    if (error?.code === 'ER_DUP_ENTRY') return NextResponse.json({ error: 'A game with that ID or slug already exists.' }, { status: 409 });
    return NextResponse.json({ error: 'Unable to update game.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAdminPrincipal();
    if (!user || !hasPermission(user, 'games.manage')) return NextResponse.json({ error: 'Game management access required.' }, { status: 403 });
    const { id } = await context.params;
    const [result] = await getPool().execute<any>('DELETE FROM games WHERE id = ?', [id]);
    if (result.affectedRows === 0) return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
    await logAdminAction(user.id, 'game.deleted', 'game', id, {}, request);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin game delete failed:', error);
    return NextResponse.json({ error: 'Unable to delete game.' }, { status: 500 });
  }
}
