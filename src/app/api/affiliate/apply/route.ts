import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getCurrentUser } from '@/lib/session';
import { getPool } from '@/lib/mysql';
import { buildAffiliateReferralUrl } from '@/lib/affiliate-links';

export const runtime = 'nodejs';

function normalizeWebsiteUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length > 512) return null;
  try {
    const parsed = new URL(value.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password) return null;
    if (!parsed.hostname.includes('.') || ['localhost', '127.0.0.1'].includes(parsed.hostname.toLowerCase())) return null;
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in with email OTP to continue.' }, { status: 401 });
    const pool = getPool();
    const [users] = await pool.execute<Array<RowDataPacket & { account_role: string }>>('SELECT account_role FROM users WHERE id = ? LIMIT 1', [user.uid]);
    const role = users[0]?.account_role;
    if (!role) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    const [profiles] = await pool.execute<Array<RowDataPacket & { referral_code: string; commission_percent: number; status: string; affiliate_type: string; website_url: string | null }>>(
      'SELECT referral_code, commission_percent, status, affiliate_type, website_url FROM affiliate_profiles WHERE user_id = ? LIMIT 1', [user.uid],
    );
    if (profiles[0]) {
      return NextResponse.json({
        state: 'affiliate',
        profile: { ...profiles[0], referralUrl: buildAffiliateReferralUrl(profiles[0].referral_code) },
      }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const [applications] = await pool.execute<Array<RowDataPacket & { id: number; website_url: string; status: string; review_note: string | null; created_at: Date | string; updated_at: Date | string }>>(
      'SELECT id, website_url, status, review_note, created_at, updated_at FROM affiliate_applications WHERE user_id = ? LIMIT 1', [user.uid],
    );
    return NextResponse.json({ state: role === 'user' ? (applications[0]?.status || 'not_applied') : 'not_eligible', application: applications[0] || null });
  } catch (error) {
    console.error('Affiliate application read failed:', error);
    return NextResponse.json({ error: 'Unable to load your affiliate application.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in with email OTP before applying.' }, { status: 401 });
    const body = await request.json();
    const websiteUrl = normalizeWebsiteUrl(body.websiteUrl);
    if (!websiteUrl) return NextResponse.json({ error: 'Enter a valid public website URL starting with https:// or http://.' }, { status: 400 });

    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [users] = await connection.execute<Array<RowDataPacket & { account_role: string; status: string }>>(
        'SELECT account_role, status FROM users WHERE id = ? FOR UPDATE', [user.uid],
      );
      const account = users[0];
      if (!account || account.status !== 'active') {
        await connection.rollback();
        return NextResponse.json({ error: 'Your account is not active.' }, { status: 403 });
      }
      if (account.account_role !== 'user') {
        await connection.rollback();
        return NextResponse.json({ error: account.account_role === 'affiliate' ? 'This account already has affiliate access.' : 'Only a regular user account can apply for affiliate access.' }, { status: 409 });
      }
      const [existingProfile] = await connection.execute<RowDataPacket[]>('SELECT user_id FROM affiliate_profiles WHERE user_id = ? LIMIT 1', [user.uid]);
      if (existingProfile.length) {
        await connection.rollback();
        return NextResponse.json({ error: 'An affiliate profile already exists for this account.' }, { status: 409 });
      }
      const [existing] = await connection.execute<Array<RowDataPacket & { id: number; status: string }>>(
        'SELECT id, status FROM affiliate_applications WHERE user_id = ? LIMIT 1 FOR UPDATE', [user.uid],
      );
      if (existing[0]?.status === 'approved') {
        await connection.rollback();
        return NextResponse.json({ error: 'This application has already been approved.' }, { status: 409 });
      }
      if (existing[0]) {
        await connection.execute(
          `UPDATE affiliate_applications SET website_url = ?, status = 'pending', review_note = NULL, reviewed_by_admin_id = NULL, reviewed_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [websiteUrl, existing[0].id],
        );
      } else {
        await connection.execute('INSERT INTO affiliate_applications (user_id, website_url, status) VALUES (?, ?, \'pending\')', [user.uid, websiteUrl]);
      }
      await connection.commit();
      return NextResponse.json({ success: true, state: 'pending', message: 'Application submitted. An admin will review your website before activating your referral profile.' }, { status: 201 });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Affiliate application submit failed:', error);
    return NextResponse.json({ error: 'Unable to submit your application. Please try again.' }, { status: 500 });
  }
}
