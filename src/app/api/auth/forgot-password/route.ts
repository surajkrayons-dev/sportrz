import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import { generateOneTimeToken, hashOneTimeToken } from '@/lib/session';
import { sendPasswordResetEmail } from '@/lib/email';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    const pool = getPool();
    const [rows] = await pool.execute<any[]>('SELECT id, email, status FROM users WHERE email = ? LIMIT 1', [email]);
    const user = rows[0];
    const genericResponse = { success: true, message: 'If an account exists for that email, password-reset instructions will be sent.' };
    if (!user || user.status !== 'active') return NextResponse.json(genericResponse);

    await pool.execute(
      `UPDATE auth_tokens SET used_at = UTC_TIMESTAMP()
       WHERE email = ? AND purpose = 'password_reset' AND used_at IS NULL`,
      [user.email],
    );
    const token = generateOneTimeToken();
    await pool.execute(
      `INSERT INTO auth_tokens (user_id, email, purpose, token_hash, expires_at)
       VALUES (?, ?, 'password_reset', ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))`,
      [user.id, user.email, hashOneTimeToken(token)],
    );
    const emailResult = await sendPasswordResetEmail(user.email, token);
    return NextResponse.json({
      ...genericResponse,
      ...(emailResult.developmentUrl ? { resetUrl: emailResult.developmentUrl } : {}),
    });
  } catch (error) {
    console.error('Password-reset request failed:', error);
    return NextResponse.json({ error: 'Unable to send password-reset instructions. Check email configuration.' }, { status: 500 });
  }
}
