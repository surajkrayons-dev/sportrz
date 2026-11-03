import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import { hashOneTimeToken, hashPassword } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = String(body.token || '');
    const password = String(body.password || '');
    if (!token || password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'A valid reset token and a password of 8–128 characters are required.' }, { status: 400 });
    }

    const pool = getPool();
    const [rows] = await pool.execute<any[]>(
      `SELECT id, user_id FROM auth_tokens
       WHERE token_hash = ? AND purpose = 'password_reset' AND used_at IS NULL
         AND expires_at > UTC_TIMESTAMP() LIMIT 1`,
      [hashOneTimeToken(token)],
    );
    const authToken = rows[0];
    if (!authToken?.user_id) return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 });

    const passwordHash = await hashPassword(password);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [validRows] = await connection.execute<any[]>(
        `SELECT id FROM auth_tokens WHERE id = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP() FOR UPDATE`,
        [authToken.id],
      );
      if (!validRows.length) {
        await connection.rollback();
        return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 });
      }
      await connection.execute('UPDATE users SET password_hash = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [passwordHash, authToken.user_id]);
      await connection.execute('UPDATE auth_tokens SET used_at = UTC_TIMESTAMP() WHERE email = (SELECT email FROM users WHERE id = ?) AND purpose = \'password_reset\' AND used_at IS NULL', [authToken.user_id]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return NextResponse.json({ success: true, message: 'Password updated. You can now sign in.' });
  } catch (error) {
    console.error('Password reset failed:', error);
    return NextResponse.json({ error: 'Unable to reset the password.' }, { status: 500 });
  }
}
