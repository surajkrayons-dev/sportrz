import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { hashOneTimeToken, setSessionCookie } from '@/lib/session';

export const runtime = 'nodejs';

interface OtpRow extends RowDataPacket {
  id: number;
  user_id: string | null;
  token_hash: string;
  attempts: number;
}

interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  display_name: string | null;
  status: 'active' | 'suspended';
}

function sameHash(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function displayNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] || 'Sportrz User';
  return localPart.replace(/[._+-]+/g, ' ').trim().slice(0, 191) || 'Sportrz User';
}

export async function POST(request: NextRequest) {
  let email = '';
  let userId = '';
  let isNewUser = false;
  let blocked = false;
  let blockedReason = '';
  let attemptsLeft = 5;
  let referralCode = '';
  let referralClickId = '';

  let connection: Awaited<ReturnType<ReturnType<typeof getPool>['getConnection']>> | null = null;
  let transactionStarted = false;

  try {
    const body = await request.json();
    email = String(body.email || '').trim().toLowerCase();
    const otp = String(body.otp || '').trim();
    // Query/body values are preferred; HTTP-only attribution cookies protect the
    // referral when the login UI is revisited or the query string is removed.
    referralCode = String(body.referralCode || request.cookies.get('sportrz_affiliate_code')?.value || '').trim().toUpperCase();
    referralClickId = String(body.clickId || request.cookies.get('sportrz_affiliate_click')?.value || '').trim();
    if (referralCode && !/^[A-Z0-9-]{3,32}$/.test(referralCode)) referralCode = '';
    if (referralClickId && !/^[A-Za-z0-9._~-]{1,191}$/.test(referralClickId)) referralClickId = '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: 'Enter the 6-digit code from your email.' }, { status: 400 });
    }

    const pool = getPool();
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [tokenRows] = await connection.execute<OtpRow[]>(
      `SELECT id, user_id, token_hash, attempts
         FROM auth_tokens
        WHERE email = ? AND purpose = 'login_otp' AND used_at IS NULL
          AND expires_at > UTC_TIMESTAMP()
        ORDER BY created_at DESC, id DESC LIMIT 1 FOR UPDATE`,
      [email],
    );

    const tokenRow = tokenRows[0];
    if (!tokenRow) {
      await connection.rollback();
      transactionStarted = false;
      return NextResponse.json({ error: 'This code is invalid or expired. Request a new code.' }, { status: 400 });
    }

    if (Number(tokenRow.attempts) >= 5) {
      await connection.rollback();
      transactionStarted = false;
      return NextResponse.json({ error: 'Too many incorrect attempts. Request a new code.' }, { status: 429 });
    }

    if (!sameHash(tokenRow.token_hash, hashOneTimeToken(`${tokenRow.id}:${email}:${otp}`))) {
      attemptsLeft = Math.max(0, 4 - Number(tokenRow.attempts));
      await connection.execute('UPDATE auth_tokens SET attempts = attempts + 1 WHERE id = ?', [tokenRow.id]);
      await connection.commit();
      transactionStarted = false;
      return NextResponse.json(
        { error: attemptsLeft > 0 ? `Incorrect code. ${attemptsLeft} attempt(s) left.` : 'Incorrect code. Request a new code.', attemptsLeft },
        { status: 400 },
      );
    }

    await connection.execute(
      'UPDATE auth_tokens SET used_at = UTC_TIMESTAMP() WHERE id = ? AND used_at IS NULL',
      [tokenRow.id],
    );

    const [userRows] = await connection.execute<UserRow[]>(
      'SELECT id, email, display_name, status FROM users WHERE email = ? LIMIT 1 FOR UPDATE',
      [email],
    );
    const existingUser = userRows[0];

    if (existingUser && existingUser.status !== 'active') {
      await connection.commit();
      transactionStarted = false;
      blocked = true;
      blockedReason = 'suspended';
    } else if (existingUser) {
      userId = existingUser.id;
      await connection.execute(
        `UPDATE users SET email_verified_at = COALESCE(email_verified_at, UTC_TIMESTAMP()),
         last_login_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = ?`,
        [userId],
      );
      await connection.execute('UPDATE auth_tokens SET user_id = ? WHERE id = ?', [userId, tokenRow.id]);
      await connection.commit();
      transactionStarted = false;
    } else {
      const [settingRows] = await connection.execute<Array<RowDataPacket & { setting_value: string | null }>>(
        `SELECT setting_value FROM site_settings WHERE setting_key = 'registration_enabled' LIMIT 1`,
      );
      if (settingRows[0]?.setting_value === 'false') {
        await connection.commit();
        transactionStarted = false;
        blocked = true;
        blockedReason = 'registration_closed';
      } else {
        userId = randomUUID();
        isNewUser = true;
        await connection.execute(
          `INSERT INTO users (id, email, display_name, email_verified_at, status, last_login_at)
           VALUES (?, ?, ?, UTC_TIMESTAMP(), 'active', UTC_TIMESTAMP())`,
          [userId, email, displayNameFromEmail(email)],
        );
        await connection.execute('UPDATE auth_tokens SET user_id = ? WHERE id = ?', [userId, tokenRow.id]);
        if (referralCode) {
          const [affiliateRows] = await connection.execute<Array<RowDataPacket & { user_id: string }>>(
            `SELECT ap.user_id FROM affiliate_profiles ap JOIN users au ON au.id = ap.user_id WHERE ap.referral_code = ? AND ap.status = 'active' AND au.account_role = 'affiliate' AND au.status = 'active' LIMIT 1`, [referralCode],
          );
          if (affiliateRows[0] && affiliateRows[0].user_id !== userId) {
            // Legacy direct /login?ref= links are still supported. When no click
            // record exists, create a first-party Click ID at signup time.
            let attributedClickId = referralClickId || `clk_${randomBytes(18).toString('hex')}`;
            const [clickRows] = await connection.execute<Array<RowDataPacket & { id: number; referred_user_id: string | null }>>(
              `SELECT id, referred_user_id FROM affiliate_clicks
                WHERE affiliate_user_id = ? AND referral_code = ? AND click_id = ?
                LIMIT 1 FOR UPDATE`,
              [affiliateRows[0].user_id, referralCode, attributedClickId],
            );
            const existingClick = clickRows[0];
            if (existingClick?.referred_user_id && existingClick.referred_user_id !== userId) {
              // Never attach one partner click to two customers. If a partner
              // reuses a click ID, create a unique first-party ID for this signup.
              attributedClickId = `clk_${randomBytes(18).toString('hex')}`;
              await connection.execute(
                `INSERT INTO affiliate_clicks
                   (affiliate_user_id, referral_code, click_id, click_source, landing_path, referred_user_id, created_at)
                 VALUES (?, ?, ?, 'sportrz', '/login', ?, UTC_TIMESTAMP())`,
                [affiliateRows[0].user_id, referralCode, attributedClickId, userId],
              );
            } else if (existingClick) {
              await connection.execute(
                `UPDATE affiliate_clicks SET referred_user_id = COALESCE(referred_user_id, ?)
                  WHERE id = ? AND (referred_user_id IS NULL OR referred_user_id = ?)`,
                [userId, existingClick.id, userId],
              );
            } else {
              await connection.execute(
                `INSERT INTO affiliate_clicks
                   (affiliate_user_id, referral_code, click_id, click_source, landing_path, referred_user_id, created_at)
                 VALUES (?, ?, ?, 'sportrz', '/login', ?, UTC_TIMESTAMP())`,
                [affiliateRows[0].user_id, referralCode, attributedClickId, userId],
              );
            }
            await connection.execute(
              `INSERT IGNORE INTO affiliate_referrals
                 (affiliate_user_id, referred_user_id, referral_code, click_id, source, status, created_at)
               VALUES (?, ?, ?, ?, 'link', 'qualified', UTC_TIMESTAMP())`,
              [affiliateRows[0].user_id, userId, referralCode, attributedClickId],
            );
          }
        }
        await connection.commit();
        transactionStarted = false;
      }
    }
  } catch (error) {
    if (connection && transactionStarted) {
      try { await connection.rollback(); } catch { /* Preserve the original error. */ }
    }
    console.error('OTP verification failed:', error);
    return NextResponse.json({ error: 'Unable to verify the code right now. Please try again.' }, { status: 500 });
  } finally {
    connection?.release();
  }

  if (blocked) {
    const message = blockedReason === 'registration_closed'
      ? 'New registrations are temporarily disabled. Please try again later.'
      : 'This account is not active. Please contact support.';
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const response = NextResponse.json({
    success: true,
    isNewUser,
    message: isNewUser ? 'Your account has been created and you are now signed in.' : 'You are now signed in.',
    user: { uid: userId, email, displayName: displayNameFromEmail(email) },
  });
  setSessionCookie(response, userId);
  response.cookies.set('sportrz_affiliate_code', '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  response.cookies.set('sportrz_affiliate_click', '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  return response;
}
