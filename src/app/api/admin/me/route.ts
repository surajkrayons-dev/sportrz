import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { getAdminPrincipal, permissionCatalog } from '@/lib/admin-access';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const actor = await getAdminPrincipal();
    if (!actor) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    let affiliate: Record<string, unknown> | null = null;
    if (actor.isAffiliate) {
      const [rows] = await getPool().execute<Array<RowDataPacket & { referral_code: string; commission_percent: number; status: string; payout_email: string | null; affiliate_type: string; website_url: string | null }>>(
        `SELECT ap.referral_code, ap.commission_percent, ap.status, ap.payout_email, ap.affiliate_type, ap.website_url
         FROM affiliate_profiles ap JOIN users u ON u.id = ap.user_id
         WHERE ap.user_id = ? AND u.account_role = 'affiliate' LIMIT 1`, [actor.id],
      );
      const row = rows[0];
      if (row) { const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL; const fallbackOrigin = process.env.NODE_ENV === 'production' ? 'https://sportrz.com' : 'http://localhost:3000'; const origin = (configuredOrigin && !/^https?:\/\/localhost(?::\d+)?$/i.test(configuredOrigin) ? configuredOrigin : fallbackOrigin).replace(/\/$/, ''); affiliate = { ...row, commission_percent: Number(row.commission_percent), referralUrl: `${origin}/login?ref=${encodeURIComponent(row.referral_code)}` }; }
    }
    const [identityRows] = await getPool().execute<Array<RowDataPacket & { display_name: string | null }>>(
      'SELECT display_name FROM users WHERE id = ? LIMIT 1', [actor.id],
    );
    return NextResponse.json({
      id: actor.id,
      email: actor.email,
      role: actor.role,
      isAdmin: true,
      isSuperAdmin: actor.isSuperAdmin,
      isAffiliate: actor.isAffiliate,
      permissions: actor.permissions,
      permissionCatalog: actor.isSuperAdmin ? permissionCatalog() : undefined,
      user: { id: actor.id, email: actor.email, displayName: identityRows[0]?.display_name || '' },
      affiliate,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Admin session details failed:', error);
    return NextResponse.json({ error: 'Unable to load admin session details.' }, { status: 500 });
  }
}
