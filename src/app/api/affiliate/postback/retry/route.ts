import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { dispatchAffiliatePostbackDelivery } from '@/lib/affiliate-postback';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in to retry a postback.' }, { status: 401 });

    const body = await request.json();
    const deliveryId = Number(body.deliveryId);
    if (!Number.isSafeInteger(deliveryId) || deliveryId < 1) {
      return NextResponse.json({ error: 'Choose a valid postback delivery.' }, { status: 400 });
    }

    const result = await dispatchAffiliatePostbackDelivery(deliveryId, user.uid);
    if (result.sent) return NextResponse.json({ success: true, message: result.alreadySent ? 'This postback was already delivered.' : 'Postback delivered successfully.' });
    return NextResponse.json({ error: result.error || 'Postback delivery failed.', status: result.status }, { status: 409 });
  } catch (error) {
    console.error('Affiliate postback retry failed:', error);
    return NextResponse.json({ error: 'Unable to retry this postback.' }, { status: 500 });
  }
}
