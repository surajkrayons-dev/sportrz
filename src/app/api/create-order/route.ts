import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import type { RowDataPacket } from 'mysql2/promise';
import { getCurrentUser } from '@/lib/session';
import { getRazorpayConfig } from '@/lib/payment-settings';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in before purchasing a plan.' }, { status: 401 });

    const body = await request.json();
    const planCode = String(body.planId || '').trim().toLowerCase();
    if (!/^[a-z0-9_-]{1,50}$/.test(planCode)) {
      return NextResponse.json({ error: 'Please select a valid subscription plan.' }, { status: 400 });
    }

    const [planRows] = await getPool().execute<any[]>(
      `SELECT id, code, name, price_paise, currency, duration_days
       FROM plans WHERE code = ? AND is_active = 1 LIMIT 1`,
      [planCode],
    );
    const plan = planRows[0];
    if (!plan) {
      return NextResponse.json({ error: 'This plan is currently disabled. Please contact the site administrator.' }, { status: 409 });
    }
    const amountPaise = Number(plan.price_paise);
    const durationDays = plan.duration_days == null ? null : Number(plan.duration_days);
    if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0 || (durationDays !== null && (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650))) {
      return NextResponse.json({ error: 'The selected plan has an invalid price or duration. Please contact the site administrator.' }, { status: 409 });
    }

    const razorpayConfig = await getRazorpayConfig();
    const razorpayKeyId = razorpayConfig?.keyId;
    const razorpaySecret = razorpayConfig?.secret;
    if (!razorpayKeyId || !razorpaySecret) {
      return NextResponse.json({ error: 'Razorpay credentials are not configured on the server.' }, { status: 500 });
    }

    const currency = String(plan.currency || 'INR').toUpperCase();

    // Keep an auditable attribution snapshot on the Razorpay Order itself.
    // This data is generated server-side from MySQL; it is not accepted from the browser.
    const [referralRows] = await getPool().execute<Array<RowDataPacket & {
      affiliate_user_id: string;
      referral_code: string;
      affiliate_email: string;
      affiliate_name: string | null;
      click_id: string | null;
    }>>(
      `SELECT ar.affiliate_user_id, ar.referral_code, ar.click_id,
              au.email AS affiliate_email, au.display_name AS affiliate_name
         FROM affiliate_referrals ar
         JOIN affiliate_profiles ap ON ap.user_id = ar.affiliate_user_id
         JOIN users au ON au.id = ar.affiliate_user_id
        WHERE ar.referred_user_id = ? AND ar.status = 'qualified'
        LIMIT 1`,
      [user.uid],
    );
    const affiliate = referralRows[0];
    const paymentNotes: Record<string, string> = {
      app: 'Sportrz',
      app_user_id: String(user.uid).slice(0, 256),
      customer_email: String(user.email || '').slice(0, 256),
      customer_name: String(user.displayName || '').slice(0, 256),
      plan_code: String(plan.code).slice(0, 256),
      plan_name: String(plan.name).slice(0, 256),
      affiliate_user_id: String(affiliate?.affiliate_user_id || 'none').slice(0, 256),
      affiliate_code: String(affiliate?.referral_code || 'none').slice(0, 256),
      affiliate_email: String(affiliate?.affiliate_email || 'none').slice(0, 256),
      affiliate_name: String(affiliate?.affiliate_name || 'none').slice(0, 256),
      affiliate_click_id: String(affiliate?.click_id || 'none').slice(0, 256),
    };

    // Razorpay supports up to 15 note key/value pairs. Keep the full attribution
    // on the server-created Order and send only the useful checkout notes to the browser.
    const checkoutNotes: Record<string, string> = {
      app_user_id: paymentNotes.app_user_id,
      customer_email: paymentNotes.customer_email,
      plan_code: paymentNotes.plan_code,
      affiliate_code: paymentNotes.affiliate_code,
    };
    const orderPayload = {
      amount: amountPaise,
      currency,
      receipt: `sp_${Date.now()}`.slice(0, 40),
      notes: paymentNotes,
    };
    const authorization = Buffer.from(`${razorpayKeyId}:${razorpaySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${authorization}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });

    const order = await response.json();
    if (!response.ok) {
      console.error('Razorpay order creation failed:', order);
      return NextResponse.json({ error: 'Razorpay could not create the order.' }, { status: response.status });
    }

    await getPool().execute(
      `INSERT INTO payments (user_id, plan_id, provider, order_id, amount_paise, currency, status)
       VALUES (?, ?, 'razorpay', ?, ?, ?, 'created')`,
      [user.uid, Number(plan.id), order.id, amountPaise, currency],
    );

    return NextResponse.json({
      success: true,
      order: { id: order.id, amount: order.amount, currency: order.currency, receipt: order.receipt },
      keyId: razorpayKeyId,
      plan: { id: plan.code, name: plan.name, durationDays },
      checkoutNotes,
    });
  } catch (error) {
    console.error('Create order failed:', error);
    return NextResponse.json({ error: 'Unable to create the payment order.' }, { status: 500 });
  }
}
