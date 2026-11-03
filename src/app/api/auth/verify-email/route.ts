import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import { hashOneTimeToken } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  const redirectUrl = new URL('/login', request.url);
  if (!token) {
    redirectUrl.searchParams.set('verification', 'invalid');
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const pool = getPool();
    const [rows] = await pool.execute<any[]>(
      `SELECT id, user_id, email FROM auth_tokens
       WHERE token_hash = ? AND purpose = 'email_verification' AND used_at IS NULL
         AND expires_at > UTC_TIMESTAMP() LIMIT 1`,
      [hashOneTimeToken(token)],
    );
    const authToken = rows[0];
    if (!authToken?.user_id) {
      redirectUrl.searchParams.set('verification', 'invalid');
      return NextResponse.redirect(redirectUrl);
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [validRows] = await connection.execute<any[]>(
        `SELECT id FROM auth_tokens WHERE id = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP() FOR UPDATE`,
        [authToken.id],
      );
      if (!validRows.length) {
        await connection.rollback();
        redirectUrl.searchParams.set('verification', 'invalid');
        return NextResponse.redirect(redirectUrl);
      }
      await connection.execute('UPDATE users SET email_verified_at = UTC_TIMESTAMP() WHERE id = ?', [authToken.user_id]);
      await connection.execute('UPDATE auth_tokens SET used_at = UTC_TIMESTAMP() WHERE id = ?', [authToken.id]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    redirectUrl.searchParams.set('verified', '1');
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Email verification failed:', error);
    redirectUrl.searchParams.set('verification', 'error');
    return NextResponse.redirect(redirectUrl);
  }
}
