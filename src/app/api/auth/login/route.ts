import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { setSessionCookie, verifyPassword } from '@/lib/session';

export const runtime = 'nodejs';

interface LoginRow extends RowDataPacket {
  id: string;
  email: string;
  display_name: string | null;
  password_hash: string | null;
  email_verified_at: Date | string | null;
  status: 'active' | 'suspended';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const pool = getPool();
    const [rows] = await pool.execute<LoginRow[]>(
      'SELECT id, email, display_name, password_hash, email_verified_at, status FROM users WHERE email = ? LIMIT 1',
      [email],
    );
    const user = rows[0];
    if (!user || user.status !== 'active' || !user.password_hash || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }
    if (!user.email_verified_at) {
      return NextResponse.json({ error: 'Please verify your email before signing in.', code: 'EMAIL_NOT_VERIFIED' }, { status: 403 });
    }

    await pool.execute('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [user.id]);
    const response = NextResponse.json({
      success: true,
      message: 'Signed in successfully.',
      user: { uid: user.id, email: user.email, displayName: user.display_name || user.email.split('@')[0] },
    });
    setSessionCookie(response, user.id);
    return response;
  } catch (error) {
    console.error('Login failed:', error);
    return NextResponse.json({ error: 'Login failed. Check the MySQL connection and try again.' }, { status: 500 });
  }
}
