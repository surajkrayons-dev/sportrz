import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getCurrentUser } from '@/lib/session';
import { getPool } from '@/lib/mysql';
import { assertPublicPostbackUrl, getAffiliatePostbackSecret, normalizePostbackTemplate } from '@/lib/affiliate-postback';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in to view your affiliate integration.' }, { status: 401 });

    const pool = getPool();
    const [profiles] = await pool.execute<Array<RowDataPacket & {
      affiliate_type: string;
      status: string;
      postback_url: string | null;
      referral_code: string;
    }>>(
      `SELECT ap.affiliate_type, ap.status, ap.postback_url, ap.referral_code
         FROM affiliate_profiles ap
         JOIN users u ON u.id = ap.user_id
        WHERE ap.user_id = ? AND u.account_role = 'affiliate' AND u.status = 'active'
        LIMIT 1`,
      [user.uid],
    );
    const profile = profiles[0];
    if (!profile) return NextResponse.json({ error: 'Affiliate profile not found.' }, { status: 404 });
    if (profile.affiliate_type !== 'external_website') {
      return NextResponse.json({ enabled: false, reason: 'This feature is available only to external website affiliates.', deliveries: [] });
    }

    const [deliveries] = await pool.execute<Array<RowDataPacket & {
      id: number;
      commission_id: number;
      status: string;
      attempt_count: number;
      http_status: number | null;
      last_error: string | null;
      sent_at: Date | string | null;
      created_at: Date | string;
      order_id: string;
      provider_payment_id: string | null;
      commission_paise: number;
      currency: string;
    }>>(
      `SELECT d.id, d.commission_id, d.status, d.attempt_count, d.http_status,
              d.last_error, d.sent_at, d.created_at, p.order_id,
              p.provider_payment_id, ac.commission_paise, p.currency
         FROM affiliate_postback_deliveries d
         JOIN affiliate_commissions ac ON ac.id = d.commission_id
         JOIN payments p ON p.id = ac.payment_record_id
        WHERE d.affiliate_user_id = ?
        ORDER BY d.created_at DESC, d.id DESC
        LIMIT 100`,
      [user.uid],
    );

    return NextResponse.json({
      enabled: true,
      postbackUrl: profile.postback_url || '',
      postbackSecret: getAffiliatePostbackSecret(user.uid),
      referralCode: profile.referral_code,
      deliveries: deliveries.map((row) => ({
        id: Number(row.id),
        commissionId: Number(row.commission_id),
        status: row.status,
        attempts: Number(row.attempt_count || 0),
        httpStatus: row.http_status == null ? null : Number(row.http_status),
        lastError: row.last_error,
        sentAt: row.sent_at,
        createdAt: row.created_at,
        orderId: row.order_id,
        paymentId: row.provider_payment_id,
        commission: Number(row.commission_paise || 0) / 100,
        currency: row.currency || 'INR',
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Affiliate postback settings read failed:', error);
    return NextResponse.json({ error: 'Unable to load postback settings.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in to update your affiliate integration.' }, { status: 401 });

    const body = await request.json();
    const supplied = body.postbackUrl;
    const postbackUrl = normalizePostbackTemplate(supplied);
    if (postbackUrl === null) {
      return NextResponse.json({
        error: 'Enter a valid HTTPS postback URL. Supported macros: {click_id}, {order_id}, {payment_id}, {amount}, {currency}, {commission}, {commission_percent}, {commission_id}, {affiliate_code}, {status}.',
      }, { status: 400 });
    }
    if (postbackUrl) await assertPublicPostbackUrl(postbackUrl);

    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [profiles] = await connection.execute<Array<RowDataPacket & { affiliate_type: string; status: string }>>(
        `SELECT ap.affiliate_type, ap.status
           FROM affiliate_profiles ap
           JOIN users u ON u.id = ap.user_id
          WHERE ap.user_id = ? AND u.account_role = 'affiliate' AND u.status = 'active'
          LIMIT 1 FOR UPDATE`,
        [user.uid],
      );
      const profile = profiles[0];
      if (!profile) {
        await connection.rollback();
        return NextResponse.json({ error: 'Affiliate profile not found.' }, { status: 404 });
      }
      if (profile.affiliate_type !== 'external_website') {
        await connection.rollback();
        return NextResponse.json({ error: 'Only external website affiliates can configure a postback URL.' }, { status: 403 });
      }
      if (profile.status !== 'active') {
        await connection.rollback();
        return NextResponse.json({ error: 'Your affiliate profile is paused. Contact Sportrz admin.' }, { status: 403 });
      }

      await connection.execute(
        'UPDATE affiliate_profiles SET postback_url = ?, updated_at = UTC_TIMESTAMP() WHERE user_id = ?',
        [postbackUrl || null, user.uid],
      );

      if (postbackUrl) {
        // Existing commission records can be queued too, so setup does not lose an earlier conversion.
        await connection.execute(
          `INSERT IGNORE INTO affiliate_postback_deliveries
             (affiliate_user_id, commission_id, destination_url, status)
           SELECT ac.affiliate_user_id, ac.id, ?, 'pending'
             FROM affiliate_commissions ac
            WHERE ac.affiliate_user_id = ?`,
          [postbackUrl, user.uid],
        );
        await connection.execute(
          `UPDATE affiliate_postback_deliveries
              SET destination_url = ?, updated_at = UTC_TIMESTAMP()
            WHERE affiliate_user_id = ? AND status IN ('pending','failed')`,
          [postbackUrl, user.uid],
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return NextResponse.json({ success: true, message: postbackUrl ? 'Postback URL saved.' : 'Postback URL disabled.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save postback settings.';
    if (message.includes('postback') || message.includes('public') || message.includes('hostname')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error('Affiliate postback settings update failed:', error);
    return NextResponse.json({ error: 'Unable to save postback settings.' }, { status: 500 });
  }
}
