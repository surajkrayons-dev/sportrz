import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getRazorpayConfig } from '@/lib/payment-settings';
import { finalizeCapturedRazorpayPayment, PaymentSettlementError } from '@/lib/razorpay-settlement';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const config = await getRazorpayConfig();
    if (!config?.keyId || !config.secret || !config.webhookSecret) {
      return NextResponse.json({ error: 'Razorpay webhook secret is not configured.' }, { status: 503 });
    }

    const signature = request.headers.get('x-razorpay-signature') || '';
    if (!/^[a-f0-9]{64}$/i.test(signature)) return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
    const rawBody = await request.text();
    if (!rawBody || rawBody.length > 1_000_000) return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 });
    const expected = createHmac('sha256', config.webhookSecret).update(rawBody, 'utf8').digest();
    const received = Buffer.from(signature, 'hex');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
    }

    let event: any;
    try { event = JSON.parse(rawBody); }
    catch { return NextResponse.json({ error: 'Webhook body must be valid JSON.' }, { status: 400 }); }
    // Only process the final captured event. Other configured events are acknowledged and ignored.
    if (event.event !== 'payment.captured') return NextResponse.json({ received: true, ignored: true });
    const webhookPayment = event?.payload?.payment?.entity;
    if (!webhookPayment?.id || !webhookPayment?.order_id || webhookPayment.status !== 'captured') {
      return NextResponse.json({ error: 'The captured payment entity is missing required fields.' }, { status: 400 });
    }

    // Re-fetch the payment from Razorpay after authenticating the webhook, then reconcile the exact order, currency and amount.
    const authorization = Buffer.from(`${config.keyId}:${config.secret}`).toString('base64');
    const providerResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(String(webhookPayment.id))}`, {
      headers: { Authorization: `Basic ${authorization}` }, cache: 'no-store',
    });
    const payment = await providerResponse.json();
    if (!providerResponse.ok) {
      console.error('Razorpay webhook payment lookup failed:', { status: providerResponse.status, paymentId: webhookPayment.id, response: payment });
      return NextResponse.json({ error: 'Could not reconcile this payment with Razorpay. The provider may retry the webhook.' }, { status: 502 });
    }
    if (payment.id !== webhookPayment.id || payment.order_id !== webhookPayment.order_id || payment.status !== 'captured') {
      return NextResponse.json({ error: 'The provider payment does not match the webhook event.' }, { status: 409 });
    }

    const result = await finalizeCapturedRazorpayPayment({
      orderId: String(payment.order_id), paymentId: String(payment.id), amount: Number(payment.amount), currency: String(payment.currency),
      status: String(payment.status), rawPayload: payment,
    });
    return NextResponse.json({ received: true, reconciled: true, alreadyApplied: result.alreadyApplied });
  } catch (error) {
    if (error instanceof PaymentSettlementError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Razorpay webhook processing failed:', error);
    return NextResponse.json({ error: 'Webhook processing failed. The provider may retry the event.' }, { status: 500 });
  }
}
