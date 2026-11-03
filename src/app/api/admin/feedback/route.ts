import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import { getAdminPrincipal, hasPermission } from '@/lib/admin-access';
import type { RowDataPacket } from 'mysql2/promise';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || !hasPermission(actor, 'feedback.view')) return NextResponse.json({ error: 'Feedback access required.' }, { status: 403 });
    const kind = request.nextUrl.searchParams.get('kind') || 'all';
    const feedback: unknown[] = [];
    const reviews: unknown[] = [];
    if (kind !== 'reviews') {
      const [rows] = await getPool().query<Array<RowDataPacket & { id: number; name: string; email: string; rating: number; comment: string; created_at: Date | string }>>(
        'SELECT id, name, email, rating, comment, created_at FROM feedback ORDER BY created_at DESC LIMIT 300',
      );
      feedback.push(...rows.map((r) => ({ id: Number(r.id), name: r.name, email: r.email, rating: Number(r.rating), comment: r.comment, createdAt: r.created_at })));
    }
    if (kind !== 'feedback') {
      const [rows] = await getPool().query<Array<RowDataPacket & { id: number; game_id: string | null; game_name: string | null; name: string; email: string; rating: number; comment: string; created_at: Date | string }>>(
        `SELECT r.id, r.game_id, g.name AS game_name, r.name, r.email, r.rating, r.comment, r.created_at
         FROM reviews r LEFT JOIN games g ON CAST(g.id AS CHAR) = CAST(r.game_id AS CHAR)
         ORDER BY r.created_at DESC LIMIT 300`,
      );
      reviews.push(...rows.map((r) => ({ id: Number(r.id), gameId: r.game_id, gameName: r.game_name || (r.game_id ? `Game ID ${r.game_id}` : 'Unknown game'), name: r.name, email: r.email, rating: Number(r.rating), comment: r.comment, createdAt: r.created_at })));
    }
    return NextResponse.json({ feedback, reviews });
  } catch (error) { console.error('Admin feedback list failed:', error); return NextResponse.json({ error: 'Unable to load feedback.' }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || !hasPermission(actor, 'feedback.manage')) return NextResponse.json({ error: 'Feedback moderation access required.' }, { status: 403 });
    const body = await request.json();
    const id = Number(body.id);
    const kind = String(body.kind || '');
    if (!Number.isSafeInteger(id) || id < 1 || !['feedback', 'review'].includes(kind)) return NextResponse.json({ error: 'Select a valid feedback or review record.' }, { status: 400 });
    const table = kind === 'review' ? 'reviews' : 'feedback';
    const [result] = await getPool().execute<any>(`DELETE FROM ${table} WHERE id = ?`, [id]);
    if (!result.affectedRows) return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
    await import('@/lib/admin-audit').then(({ logAdminAction }) => logAdminAction(actor.id, `${kind}.deleted`, kind, id, { moderated: true }, request));
    return NextResponse.json({ success: true, message: `${kind === 'review' ? 'Game review' : 'Feedback'} removed.` });
  } catch (error) {
    console.error('Admin feedback moderation failed:', error);
    return NextResponse.json({ error: 'Unable to moderate this record.' }, { status: 500 });
  }
}
