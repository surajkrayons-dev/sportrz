import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getCurrentUser } from '@/lib/session';
import { getPool } from '@/lib/mysql';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in to view your affiliate postback history.' }, { status: 401 });

    const [profiles] = await getPool().execute<Array<RowDataPacket & {
      affiliate_type: string; status: string; postback_url: string | null;
    }>>(
      `SELECT ap.affiliate_type, ap.status, ap.postback_url
         FROM affiliate_profiles ap
         JOIN users u ON u.id = ap.user_id
        WHERE ap.user_id = ? AND u.account_role = 'affiliate' AND u.status = 'active'
        LIMIT 1`,
      [user.uid],
    );
    const profile = profiles[0];
    if (!profile) return NextResponse.json({ error: 'Affiliate profile not found.' }, { status: 404 });

    const [deliveries] = await getPool().execute<Array<RowDataPacket & {
      id: number; commission_id: number; status: string; attempt_count: number;
      http_status: number | null; last_error: string | null; sent_at: Date | string | null;
      created_at: Date | string; order_id: string; provider_payment_id: string | null;
      commission_paise: number; currency: string; click_id: string | null;
    }>>(
      `SELECT d.id, d.commission_id, d.status, d.attempt_count, d.http_status,
              d.last_error, d.sent_at, d.created_at, p.order_id, p.provider_payment_id,
              ac.commission_paise, p.currency, ar.click_id
         FROM affiliate_postback_deliveries d
         JOIN affiliate_commissions ac ON ac.id = d.commission_id
         JOIN payments p ON p.id = ac.payment_record_id
         LEFT JOIN affiliate_referrals ar
           ON ar.referred_user_id = ac.referred_user_id AND ar.affiliate_user_id = d.affiliate_user_id
        WHERE d.affiliate_user_id = ?
        ORDER BY d.created_at DESC, d.id DESC
        LIMIT 100`,
      [user.uid],
    );

    return NextResponse.json({
      enabled: profile.affiliate_type === 'external_website',
      configured: Boolean(profile.postback_url),
      managedBy: 'Sportrz admin',
      deliveries: deliveries.map((row) => ({
        id: Number(row.id), commissionId: Number(row.commission_id), status: row.status,
        attempts: Number(row.attempt_count || 0), httpStatus: row.http_status == null ? null : Number(row.http_status),
        lastError: row.last_error, sentAt: row.sent_at, createdAt: row.created_at,
        orderId: row.order_id, paymentId: row.provider_payment_id,
        commission: Number(row.commission_paise || 0) / 100, currency: row.currency || 'INR',
        clickId: row.click_id || '',
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Affiliate postback history read failed:', error);
    return NextResponse.json({ error: 'Unable to load postback history.' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Postback settings are managed by Sportrz administration.' }, { status: 403 });
}
