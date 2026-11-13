import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { getAdminPrincipal, hasPermission } from '@/lib/admin-access';
import { logAdminAction } from '@/lib/admin-audit';
import { dispatchAffiliatePostbackDelivery } from '@/lib/affiliate-postback';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || actor.isAffiliate || (!actor.isSuperAdmin && !hasPermission(actor, 'affiliates.manage'))) {
      return NextResponse.json({ error: 'Affiliate management access required.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const deliveryId = Number(body.deliveryId);
    if (!Number.isSafeInteger(deliveryId) || deliveryId < 1) {
      return NextResponse.json({ error: 'Choose a valid postback delivery.' }, { status: 400 });
    }

    const [rows] = await getPool().execute<Array<RowDataPacket & { affiliate_user_id: string }>>(
      'SELECT affiliate_user_id FROM affiliate_postback_deliveries WHERE id = ? LIMIT 1',
      [deliveryId],
    );
    const delivery = rows[0];
    if (!delivery) return NextResponse.json({ error: 'Postback delivery not found.' }, { status: 404 });

    const result = await dispatchAffiliatePostbackDelivery(deliveryId, delivery.affiliate_user_id);
    await logAdminAction(actor.id, 'affiliate.postback_retry', 'affiliate_postback_delivery', deliveryId, {
      affiliateUserId: delivery.affiliate_user_id,
      success: result.sent,
      httpStatus: result.status ?? null,
    }, request);

    if (!result.sent) {
      return NextResponse.json({ error: result.error || 'Postback delivery failed.', status: result.status }, { status: 502 });
    }
    return NextResponse.json({ success: true, status: result.status, message: result.alreadySent ? 'This postback was already delivered.' : `Postback delivered (HTTP ${result.status}).` });
  } catch (error) {
    console.error('Admin affiliate postback retry failed:', error);
    return NextResponse.json({ error: 'Unable to retry this postback.' }, { status: 500 });
  }
}
