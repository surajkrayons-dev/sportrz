import { randomInt, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import { hashOneTimeToken } from '@/lib/session';
import { isOtpEmailConfigured, sendLoginOtpEmail } from '@/lib/email';

export const runtime = 'nodejs';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_COOLDOWN_SECONDS = 60;
const OTP_LIFETIME_MINUTES = 10;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();

    if (email.length > 191 || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!isOtpEmailConfigured()) {
      return NextResponse.json(
        { error: 'Email OTP is not configured yet. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, and EMAIL_FROM to .env.local.' },
        { status: 503 },
      );
    }

    const pool = getPool();
    // auth_tokens.created_at defaults to CURRENT_TIMESTAMP (the database server's
    // local timezone), so compare it with CURRENT_TIMESTAMP too. Mixing it with
    // UTC_TIMESTAMP can create a false multi-hour cooldown on non-UTC servers.
    // Only a live, unused OTP should trigger the resend cooldown; failed email
    // deliveries are marked used below and must be retryable.
    const [recentRows] = await pool.execute<any[]>(
      `SELECT GREATEST(1, ? - TIMESTAMPDIFF(SECOND, created_at, CURRENT_TIMESTAMP())) AS retry_after
         FROM auth_tokens
        WHERE email = ? AND purpose = 'login_otp' AND used_at IS NULL
          AND created_at >= DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 SECOND)
          AND created_at <= CURRENT_TIMESTAMP()
        ORDER BY created_at DESC, id DESC LIMIT 1`,
      [OTP_COOLDOWN_SECONDS, email],
    );

    if (recentRows.length) {
      const retryAfterSeconds = Number(recentRows[0].retry_after) || OTP_COOLDOWN_SECONDS;
      return NextResponse.json(
        { error: `Please wait ${retryAfterSeconds} seconds before requesting another code.`, retryAfterSeconds },
        { status: 429 },
      );
    }

    // Invalidate older codes so only the most recently issued code can be used.
    await pool.execute(
      `UPDATE auth_tokens SET used_at = UTC_TIMESTAMP()
        WHERE email = ? AND purpose = 'login_otp' AND used_at IS NULL`,
      [email],
    );

    const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
    // token_hash is unique in the supplied schema. Use the row ID as a salt so
    // historical OTPs (including repeated 6-digit values) cannot collide.
    const placeholderHash = hashOneTimeToken(randomUUID());
    const [insertResult] = await pool.execute<any>(
      `INSERT INTO auth_tokens (user_id, email, purpose, token_hash, attempts, expires_at, created_at)
       VALUES (NULL, ?, 'login_otp', ?, 0, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${OTP_LIFETIME_MINUTES} MINUTE), CURRENT_TIMESTAMP())`,
      [email, placeholderHash],
    );
    const tokenHash = hashOneTimeToken(`${insertResult.insertId}:${email}:${otp}`);
    await pool.execute('UPDATE auth_tokens SET token_hash = ? WHERE id = ?', [tokenHash, insertResult.insertId]);

    try {
      await sendLoginOtpEmail(email, otp);
      return NextResponse.json({
        success: true,
        message: 'Your 6-digit code has been emailed to you. It expires in 10 minutes.',
        retryAfterSeconds: OTP_COOLDOWN_SECONDS,
      });
    } catch (emailError) {
      await pool.execute(
        `UPDATE auth_tokens SET used_at = UTC_TIMESTAMP()
          WHERE email = ? AND purpose = 'login_otp' AND token_hash = ? AND used_at IS NULL`,
        [email, tokenHash],
      );
      throw emailError;
    }
  } catch (error) {
    console.error('Unable to send sign-in OTP:', error);
    const deliveryFailed = error instanceof Error && error.message.includes('OTP email delivery failed');
    return NextResponse.json(
      { error: deliveryFailed
        ? 'We could not deliver the email. Check SMTP_HOST, SMTP_PORT, mailbox credentials, sender address, and the cPanel delivery report.'
        : 'Unable to send the verification code. Check SMTP configuration and try again.' },
      { status: deliveryFailed ? 502 : 500 },
    );
  }
}
