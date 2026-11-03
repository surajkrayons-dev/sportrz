import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getPool } from '@/lib/mysql';
import { generateOneTimeToken, hashOneTimeToken, hashPassword } from '@/lib/session';
import { sendVerificationEmail } from '@/lib/email';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const displayName = String(body.displayName || '').trim();
    const password = String(body.password || '');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    if (displayName.length < 2 || displayName.length > 150) {
      return NextResponse.json({ error: 'Name must be between 2 and 150 characters.' }, { status: 400 });
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'Password must be 8–128 characters long.' }, { status: 400 });
    }

    const pool = getPool();
    const [existing] = await pool.execute<any[]>('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length) {
      return NextResponse.json({ error: 'An account with this email already exists. Please sign in or reset its password.' }, { status: 409 });
    }

    const userId = randomUUID();
    const passwordHash = await hashPassword(password);
    await pool.execute(
      `INSERT INTO users (id, email, display_name, password_hash, avatar, status)
       VALUES (?, ?, ?, ?, 'avatar1', 'active')`,
      [userId, email, displayName, passwordHash],
    );

    const token = generateOneTimeToken();
    await pool.execute(
      `INSERT INTO auth_tokens (user_id, email, purpose, token_hash, expires_at)
       VALUES (?, ?, 'email_verification', ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))`,
      [userId, email, hashOneTimeToken(token)],
    );

    try {
      const emailResult = await sendVerificationEmail(email, token);
      return NextResponse.json({
        success: true,
        message: emailResult.developmentUrl
          ? 'Account created. Open the local verification link below to activate your account.'
          : 'Account created. Check your email to verify your address before signing in.',
        emailSent: emailResult.sent,
        ...(emailResult.developmentUrl ? { verificationUrl: emailResult.developmentUrl } : {}),
      }, { status: 201 });
    } catch (emailError) {
      console.error('Unable to deliver verification email:', emailError);
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: 'Account created, but the verification email could not be sent. Configure email delivery and use Resend Verification Email.',
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Registration failed:', error);
    return NextResponse.json({ error: 'Registration failed. Check the MySQL connection and try again.' }, { status: 500 });
  }
}
