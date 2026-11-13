import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { getAdminPrincipal, hasPermission } from '@/lib/admin-access';
import { logAdminAction } from '@/lib/admin-audit';
import { sendAffiliatePostbackEvent, type AffiliatePostbackMethod } from '@/lib/affiliate-postback';

export const runtime = 'nodejs';

interface AffiliatePostbackProfile extends RowDataPacket {
  user_id: string;
  referral_code: string;
  affiliate_type: string;
  status: string;
  postback_url: string | null;
  postback_method: AffiliatePostbackMethod | null;
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || actor.isAffiliate || (!actor.isSuperAdmin && !hasPermission(actor, 'affiliates.manage'))) {
      return NextResponse.json({ error: 'Affiliate management access required.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const userId = String(body.userId || '').trim();
    if (!userId || userId.length > 36) {
      return NextResponse.json({ error: 'Choose a valid affiliate account.' }, { status: 400 });
    }

    const [rows] = await getPool().execute<AffiliatePostbackProfile[]>(
      `SELECT ap.user_id, ap.referral_code, ap.affiliate_type, ap.status,
              ap.postback_url, ap.postback_method
         FROM affiliate_profiles ap
         JOIN users u ON u.id = ap.user_id
        WHERE ap.user_id = ? AND u.account_role = 'affiliate' AND u.status = 'active'
        LIMIT 1`,
      [userId],
    );
    const profile = rows[0];
    if (!profile) return NextResponse.json({ error: 'Affiliate profile not found.' }, { status: 404 });
    if (profile.affiliate_type !== 'external_website') {
      return NextResponse.json({ error: 'S2S postback testing is available only for external website affiliates.' }, { status: 409 });
    }
    if (profile.status !== 'active') {
      return NextResponse.json({ error: 'This affiliate is paused. Activate the affiliate before testing.' }, { status: 409 });
    }
    if (!profile.postback_url) {
      return NextResponse.json({ error: 'Save a postback destination URL in this affiliate profile before sending a test event.' }, { status: 409 });
    }

    const payload = {
      event: 'test',
      commission_id: `TEST-${randomBytes(5).toString('hex')}`,
      affiliate_code: profile.referral_code,
      click_id: `test_${randomBytes(12).toString('hex')}`,
      order_id: `TEST-ORDER-${randomBytes(5).toString('hex').toUpperCase()}`,
      payment_id: `TEST-PAYMENT-${randomBytes(5).toString('hex').toUpperCase()}`,
      amount: '100.00',
      currency: 'INR',
      commission: '10.00',
      commission_percent: '10.00',
      status: 'test',
      occurred_at: new Date().toISOString(),
    };

    const result = await sendAffiliatePostbackEvent({
      destinationUrl: profile.postback_url,
      method: profile.postback_method || 'POST',
      affiliateUserId: profile.user_id,
      deliveryId: `test-${payload.commission_id}`,
      payload,
    });

    await logAdminAction(actor.id, 'affiliate.postback_test_sent', 'affiliate_profile', userId, {
      method: profile.postback_method || 'POST',
      httpStatus: result.status,
    }, request);

    return NextResponse.json({
      success: true,
      status: result.status,
      message: `Test event delivered successfully (HTTP ${result.status}).`,
      responseExcerpt: result.responseExcerpt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send the test postback.';
    console.error('Affiliate postback test failed:', error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
