import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { setSessionCookie } from '@/lib/session';

export const runtime = 'nodejs';

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}
interface ExistingUser extends RowDataPacket { id: string; }

export async function GET(request: NextRequest) {
  const errorUrl = new URL('/login', request.url);
  const code = request.nextUrl.searchParams.get('code');
  const returnedState = request.nextUrl.searchParams.get('state') || '';
  const savedState = request.cookies.get('sportrz_google_state')?.value || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/google/callback`;

  if (!code || !returnedState || !savedState || returnedState.length !== savedState.length || !timingSafeEqual(Buffer.from(returnedState), Buffer.from(savedState))) {
    errorUrl.searchParams.set('error', 'google_auth_failed');
    return clearOAuthCookie(NextResponse.redirect(errorUrl));
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('Google OAuth is not configured.');

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok) throw new Error(`Google token exchange failed (${tokenResponse.status}).`);
    const tokenData = await tokenResponse.json() as { access_token?: string };
    if (!tokenData.access_token) throw new Error('Google did not return an access token.');

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileResponse.ok) throw new Error(`Google profile request failed (${profileResponse.status}).`);
    const profile = await profileResponse.json() as GoogleUserInfo;
    const email = String(profile.email || '').trim().toLowerCase();
    if (!profile.sub || !email || !profile.email_verified) throw new Error('Google account did not provide a verified email.');

    const pool = getPool();
    const [rows] = await pool.execute<ExistingUser[]>(
      `SELECT u.id
       FROM users u
       LEFT JOIN oauth_accounts oa ON oa.user_id = u.id AND oa.provider = 'google'
       WHERE oa.provider_account_id = ? OR u.email = ?
       LIMIT 1`,
      [profile.sub, email],
    );
    let userId = rows[0]?.id;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      if (userId) {
        const [activeUser] = await connection.execute<any[]>("SELECT id FROM users WHERE id = ? AND status = 'active' FOR UPDATE", [userId]);
        if (!activeUser.length) throw new Error('This Sportrz account is suspended.');
        await connection.execute(
          `UPDATE users SET display_name = ?, photo_url = ?, email_verified_at = COALESCE(email_verified_at, UTC_TIMESTAMP()),
           updated_at = UTC_TIMESTAMP() WHERE id = ?`,
          [profile.name || email.split('@')[0], profile.picture || null, userId],
        );
      } else {
        userId = randomUUID();
        await connection.execute(
          `INSERT INTO users (id, email, display_name, photo_url, email_verified_at, status)
           VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), 'active')`,
          [userId, email, profile.name || email.split('@')[0], profile.picture || null],
        );
      }

      await connection.execute(
        `INSERT INTO oauth_accounts (user_id, provider, provider_account_id, provider_email)
         VALUES (?, 'google', ?, ?)
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), provider_email = VALUES(provider_email), updated_at = UTC_TIMESTAMP()`,
        [userId, profile.sub, email],
      );
      await connection.execute('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [userId]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const response = NextResponse.redirect(new URL('/', request.url));
    setSessionCookie(response, userId!);
    return clearOAuthCookie(response);
  } catch (error) {
    console.error('Google sign-in failed:', error);
    errorUrl.searchParams.set('error', 'google_auth_failed');
    return clearOAuthCookie(NextResponse.redirect(errorUrl));
  }
}

function clearOAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set('sportrz_google_state', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/google/callback',
    maxAge: 0,
  });
  return response;
}
