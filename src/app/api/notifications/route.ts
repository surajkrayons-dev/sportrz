import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import { getCurrentUser } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    const pool = getPool();

    if (!user.hasReceivedWelcomeNotification) {
      const [welcomeRows] = await pool.execute<any[]>(
        "SELECT id FROM notifications WHERE user_id = ? AND type = 'welcome' LIMIT 1",
        [user.uid],
      );
      if (!welcomeRows.length) {
        await pool.execute(
          `INSERT INTO notifications (user_id, type, title, message, is_read)
           VALUES (?, 'welcome', ?, ?, 0)`,
          [user.uid, 'Welcome to Sportrz!', 'Welcome to Sportrz! Explore our collection of games and check out the available plans for more play time.'],
        );
      }
      await pool.execute('UPDATE users SET has_received_welcome_notification = 1 WHERE id = ?', [user.uid]);
    }

    const [rows] = await pool.execute<any[]>(
      `SELECT id, type, title, message, is_read, created_at, updated_at
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`,
      [user.uid],
    );
    const notifications = rows.map((row) => ({
      id: String(row.id),
      type: row.type,
      title: row.title,
      message: row.message,
      read: Boolean(row.is_read),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    }));
    return NextResponse.json({ notifications, unreadCount: notifications.filter((item) => !item.read).length });
  } catch (error) {
    console.error('Notifications query failed:', error);
    return NextResponse.json({ error: 'Unable to load notifications.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    const body = await request.json();
    const pool = getPool();

    if (body.markAll === true) {
      await pool.execute('UPDATE notifications SET is_read = 1, updated_at = UTC_TIMESTAMP() WHERE user_id = ?', [user.uid]);
      return NextResponse.json({ success: true });
    }

    const id = String(body.id || '');
    if (!id) return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
    const [result] = await pool.execute<any>(
      'UPDATE notifications SET is_read = 1, updated_at = UTC_TIMESTAMP() WHERE id = ? AND user_id = ?',
      [id, user.uid],
    );
    if (!result.affectedRows) return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification update failed:', error);
    return NextResponse.json({ error: 'Unable to update notification.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    const body = await request.json();
    const type = ['welcome', 'info', 'success', 'warning'].includes(body.type) ? body.type : 'info';
    const title = String(body.title || '').trim().slice(0, 200);
    const message = String(body.message || '').trim().slice(0, 5000);
    if (!title || !message) return NextResponse.json({ error: 'Title and message are required.' }, { status: 400 });
    const [result] = await getPool().execute<any>(
      'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
      [user.uid, type, title, message],
    );
    return NextResponse.json({ success: true, id: String(result.insertId) }, { status: 201 });
  } catch (error) {
    console.error('Notification creation failed:', error);
    return NextResponse.json({ error: 'Unable to create notification.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
    const [result] = await getPool().execute<any>('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, user.uid]);
    if (!result.affectedRows) return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification deletion failed:', error);
    return NextResponse.json({ error: 'Unable to delete notification.' }, { status: 500 });
  }
}
