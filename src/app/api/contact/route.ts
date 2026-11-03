import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { getCurrentUser } from '@/lib/session';
import { getAdminPrincipal, hasPermission } from '@/lib/admin-access';

export const runtime = 'nodejs';
const SUBJECTS = new Set(['general', 'technical', 'game-suggestion', 'bug-report', 'partnership', 'other']);

interface ContactRow extends RowDataPacket {
  id: number | string; name: string; email: string; subject: string; message: string;
  status: 'read' | 'unread'; user_agent: string | null; created_at: Date | string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const subject = String(body.subject || 'general').trim();
    const message = String(body.message || '').trim();
    if (name.length < 2 || name.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 5 || message.length > 10000 || !SUBJECTS.has(subject)) {
      return NextResponse.json({ error: 'Please provide a valid name, email, subject, and message.' }, { status: 400 });
    }

    const currentUser = await getCurrentUser().catch(() => null);
    const [result] = await getPool().execute<any>(
      `INSERT INTO contact_messages (user_id, name, email, subject, message, status, user_agent)
       VALUES (?, ?, ?, ?, ?, 'unread', ?)`,
      [currentUser?.uid || null, name, email, subject, message, request.headers.get('user-agent')?.slice(0, 512) || null],
    );
    return NextResponse.json({ success: true, id: String(result.insertId), message: 'Message submitted successfully.' }, { status: 201 });
  } catch (error) {
    console.error('Contact submission failed:', error);
    return NextResponse.json({ error: 'Unable to submit your message. Please try again later.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAdminPrincipal();
    if (!user || !hasPermission(user, 'messages.view')) return NextResponse.json({ error: 'Contact message access required.' }, { status: 403 });
    const status = request.nextUrl.searchParams.get('status');
    const pool = getPool();
    let rows: ContactRow[];
    if (status === 'read' || status === 'unread') {
      const [result] = await pool.execute<ContactRow[]>(
        'SELECT id, name, email, subject, message, status, user_agent, created_at FROM contact_messages WHERE status = ? ORDER BY created_at DESC',
        [status],
      );
      rows = result;
    } else {
      const [result] = await pool.execute<ContactRow[]>(
        'SELECT id, name, email, subject, message, status, user_agent, created_at FROM contact_messages ORDER BY created_at DESC',
      );
      rows = result;
    }
    return NextResponse.json(rows.map((row) => {
      const createdAt = new Date(row.created_at).toISOString();
      return {
        id: String(row.id), name: row.name, email: row.email, subject: row.subject, message: row.message,
        status: row.status, createdAt, timestamp: createdAt, userAgent: row.user_agent || undefined,
      };
    }));
  } catch (error) {
    console.error('Contact messages query failed:', error);
    return NextResponse.json({ error: 'Unable to load contact messages.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAdminPrincipal();
    if (!user || !hasPermission(user, 'messages.manage')) return NextResponse.json({ error: 'Contact message access required.' }, { status: 403 });
    const body = await request.json();
    const id = String(body.id || '');
    const status = String(body.status || '');
    if (!/^\d+$/.test(id) || (status !== 'read' && status !== 'unread')) {
      return NextResponse.json({ error: 'A valid message ID and status are required.' }, { status: 400 });
    }
    const [result] = await getPool().execute<any>(
      'UPDATE contact_messages SET status = ?, read_at = ? WHERE id = ?',
      [status, status === 'read' ? new Date() : null, Number(id)],
    );
    if (!result.affectedRows) return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact status update failed:', error);
    return NextResponse.json({ error: 'Unable to update message status.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAdminPrincipal();
    if (!user || !hasPermission(user, 'messages.manage')) return NextResponse.json({ error: 'Contact message access required.' }, { status: 403 });
    const id = request.nextUrl.searchParams.get('id') || '';
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: 'A valid message ID is required.' }, { status: 400 });
    const [result] = await getPool().execute<any>('DELETE FROM contact_messages WHERE id = ?', [Number(id)]);
    if (!result.affectedRows) return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact message deletion failed:', error);
    return NextResponse.json({ error: 'Unable to delete message.' }, { status: 500 });
  }
}
