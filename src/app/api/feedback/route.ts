import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { getCurrentUser } from '@/lib/session';
import { getAdminPrincipal, hasPermission } from '@/lib/admin-access';

export const runtime = 'nodejs';
interface FeedbackRow extends RowDataPacket {
  id: number | string; name: string; email: string; rating: number; comment: string; created_at: Date | string;
}

export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get('type') || 'top';
    if (type !== 'top' && type !== 'all') return NextResponse.json({ error: 'Invalid type parameter.' }, { status: 400 });
    if (type === 'all') {
      const user = await getAdminPrincipal();
      if (!user || !hasPermission(user, 'feedback.view')) return NextResponse.json({ error: 'Feedback access required.' }, { status: 403 });
    }

    const sql = type === 'top'
      ? 'SELECT id, name, email, rating, comment, created_at FROM feedback ORDER BY rating DESC, created_at DESC LIMIT 5'
      : 'SELECT id, name, email, rating, comment, created_at FROM feedback ORDER BY created_at DESC';
    const [rows] = await getPool().execute<FeedbackRow[]>(sql);
    return NextResponse.json({ success: true, data: rows.map(mapFeedback) });
  } catch (error) {
    console.error('Feedback query failed:', error);
    return NextResponse.json({ error: 'Unable to fetch feedback.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const rating = Number(body.rating);
    const comment = String(body.comment || '').trim();
    if (name.length < 2 || name.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 3 || comment.length > 5000) {
      return NextResponse.json({ error: 'Enter a valid name, email, 1–5 rating, and comment.' }, { status: 400 });
    }

    const user = await getCurrentUser().catch(() => null);
    const [result] = await getPool().execute<any>(
      'INSERT INTO feedback (user_id, name, email, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [user?.uid || null, name, email, rating, comment],
    );
    return NextResponse.json({ success: true, data: { id: String(result.insertId) }, message: 'Feedback submitted successfully.' }, { status: 201 });
  } catch (error) {
    console.error('Feedback submission failed:', error);
    return NextResponse.json({ error: 'Unable to submit feedback.' }, { status: 500 });
  }
}

function mapFeedback(row: FeedbackRow) {
  const createdAt = new Date(row.created_at).toISOString();
  return { id: String(row.id), name: row.name, email: row.email, rating: Number(row.rating), comment: row.comment, date: createdAt.slice(0, 10), timestamp: new Date(createdAt).getTime(), createdAt };
}
