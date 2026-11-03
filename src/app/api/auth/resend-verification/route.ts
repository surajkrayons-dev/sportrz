import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import { generateOneTimeToken, hashOneTimeToken } from '@/lib/session';
import { sendVerificationEmail } from '@/lib/email';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });

    const pool = getPool();
    const [rows] = await pool.execute<any[]>(
      'SELECT id, email, email_verified_at, status FROM users WHERE email = ? LIMIT 1', [email],
    );
    const user = rows[0];
    const genericResponse = { success: true, message: 'If the account exists and still needs verification, a new verification email will be sent.' };
    if (!user || user.email_verified_at || user.status !== 'active') return NextResponse.json(genericResponse);

    await pool.execute(
      `UPDATE auth_tokens SET used_at = UTC_TIMESTAMP()
       WHERE email = ? AND purpose = 'email_verification' AND used_at IS NULL`,
      [user.email],
    );
    const token = generateOneTimeToken();
    await pool.execute(
      `INSERT INTO auth_tokens (user_id, email, purpose, token_hash, expires_at)
       VALUES (?, ?, 'email_verification', ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))`,
      [user.id, user.email, hashOneTimeToken(token)],
    );

    const emailResult = await sendVerificationEmail(user.email, token);
    return NextResponse.json({
      ...genericResponse,
      ...(emailResult.developmentUrl ? { verificationUrl: emailResult.developmentUrl } : {}),
    });
  } catch (error) {
    console.error('Resend verification failed:', error);
    return NextResponse.json({ error: 'Unable to resend the verification email. Check email configuration.' }, { status: 500 });
  }
}
