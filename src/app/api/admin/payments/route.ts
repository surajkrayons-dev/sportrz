import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { getAdminPrincipal, hasPermission } from '@/lib/admin-access';
import { getRazorpayConfig } from '@/lib/payment-settings';
import { logAdminAction } from '@/lib/admin-audit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || !hasPermission(actor, 'payments.view')) return NextResponse.json({ error: 'Payment viewing access required.' }, { status: 403 });
    const status = request.nextUrl.searchParams.get('status') || 'all';
    const values: Array<string | number | null> = [];
    const where: string[] = ['1=1'];
    if (status !== 'all' && ['created','authorized','captured','failed','refunded'].includes(status)) { where.push('p.status = ?'); values.push(status); }
    const [rows] = await getPool().execute<Array<RowDataPacket & { id: number; user_id: string; email: string; plan_name: string; order_id: string; provider_payment_id: string | null; amount_paise: number; currency: string; status: string; provider: string; paid_at: Date | string | null; created_at: Date | string; provider_payload: string | null }>>(
      `SELECT p.id, p.user_id, u.email, pl.name AS plan_name, p.order_id, p.provider_payment_id, p.amount_paise, p.currency, p.status, p.provider, p.paid_at, p.created_at, p.provider_payload
       FROM payments p JOIN users u ON u.id = p.user_id JOIN plans pl ON pl.id = p.plan_id
       WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC LIMIT 500`, values,
    );
    return NextResponse.json({ payments: rows.map((r) => {
      let refund: any = null;
      try { refund = r.provider_payload ? JSON.parse(r.provider_payload).refund || null : null; } catch { refund = null; }
      return { id: Number(r.id), userId: r.user_id, email: r.email, planName: r.plan_name, orderId: r.order_id,
        paymentId: r.provider_payment_id, amount: Number(r.amount_paise) / 100, currency: r.currency, status: r.status, provider: r.provider, paidAt: r.paid_at, createdAt: r.created_at,
        refundId: refund?.id || null, refundStatus: refund?.status || null };
    }) });
  } catch (error) { console.error('Admin payments list failed:', error); return NextResponse.json({ error: 'Unable to load payments.' }, { status: 500 }); }
}


export async function PATCH(request: NextRequest) {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || !hasPermission(actor, 'payments.manage')) return NextResponse.json({ error: 'Refund permission is required.' }, { status: 403 });
    const body = await request.json();
    const paymentRecordId = Number(body.id);
    if (!Number.isSafeInteger(paymentRecordId) || paymentRecordId < 1 || !['refund','sync-refund'].includes(String(body.action))) {
      return NextResponse.json({ error: 'Choose a valid payment and refund action.' }, { status: 400 });
    }
    const [rows] = await getPool().execute<Array<RowDataPacket & { id: number; user_id: string; provider: string; provider_payment_id: string | null; amount_paise: number; currency: string; status: string; order_id: string; provider_payload: string | null }>>(
      'SELECT id, user_id, provider, provider_payment_id, amount_paise, currency, status, order_id, provider_payload FROM payments WHERE id = ? LIMIT 1', [paymentRecordId],
    );
    const payment = rows[0];
    if (!payment) return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 });
    if (body.action === 'refund' && payment.status === 'refunded') return NextResponse.json({ error: 'This payment is already marked refunded.' }, { status: 409 });
    if (payment.provider !== 'razorpay' || !payment.provider_payment_id) return NextResponse.json({ error: 'Only Razorpay payments with a payment ID can be managed here.' }, { status: 409 });
    if (body.action === 'refund' && payment.status !== 'captured') return NextResponse.json({ error: 'Only captured payments can be refunded.' }, { status: 409 });
    if (body.action === 'refund') {
      try {
        const previousPayload = payment.provider_payload ? JSON.parse(payment.provider_payload) : null;
        if (previousPayload?.refund?.id) return NextResponse.json({ error: 'A refund has already been requested for this payment. Use Sync refund status instead.' }, { status: 409 });
      } catch { /* Existing payment provider payload may not be JSON; no recorded refund was found. */ }
    }
    const config = await getRazorpayConfig();
    if (!config) return NextResponse.json({ error: 'Razorpay credentials are not configured.' }, { status: 503 });
    const authorization = Buffer.from(`${config.keyId}:${config.secret}`).toString('base64');
    if (body.action === 'sync-refund') {
      let currentRefund: any = null;
      try { currentRefund = payment.provider_payload ? JSON.parse(payment.provider_payload).refund || null : null; } catch { currentRefund = null; }
      if (!currentRefund?.id) return NextResponse.json({ error: 'No refund request is recorded for this payment yet.' }, { status: 409 });
      const syncResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(payment.provider_payment_id)}/refunds`, {
        method: 'GET', headers: { Authorization: `Basic ${authorization}` },
      });
      const syncData = await syncResponse.json().catch(() => ({}));
      if (!syncResponse.ok) return NextResponse.json({ error: syncData?.error?.description || 'Unable to query refund status from Razorpay.' }, { status: 502 });
      const refreshedRefund = Array.isArray(syncData.items) ? syncData.items.find((item: any) => item.id === currentRefund.id) || currentRefund : currentRefund;
      if (String(refreshedRefund.status || '').toLowerCase() === 'processed' && payment.status !== 'refunded') {
        const connection = await getPool().getConnection();
        try {
          await connection.beginTransaction();
          await connection.execute("UPDATE payments SET status = 'refunded', provider_payload = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?", [JSON.stringify({ refund: refreshedRefund }), payment.id]);
          await connection.execute("UPDATE subscriptions SET status = 'cancelled', updated_at = UTC_TIMESTAMP() WHERE payment_record_id = ? AND status = 'active'", [payment.id]);
          await connection.execute("UPDATE affiliate_commissions SET status = 'reversed', updated_at = UTC_TIMESTAMP() WHERE payment_record_id = ? AND status IN ('pending','approved')", [payment.id]);
          await connection.commit();
        } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
      } else {
        await getPool().execute('UPDATE payments SET provider_payload = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [JSON.stringify({ refund: refreshedRefund }), payment.id]);
      }
      await logAdminAction(actor.id, 'payment.refund_status_synced', 'payment', payment.id, { refundId: refreshedRefund.id, refundStatus: refreshedRefund.status || null }, request);
      return NextResponse.json({ success: true, refund: { id: refreshedRefund.id, status: refreshedRefund.status || 'pending' }, message: String(refreshedRefund.status || '').toLowerCase() === 'processed' ? 'Razorpay confirms the refund is processed.' : `Razorpay refund status: ${refreshedRefund.status || 'pending'}.` });
    }
    const refundResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(payment.provider_payment_id)}/refund`, {
      method: 'POST',
      headers: { Authorization: `Basic ${authorization}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(payment.amount_paise), notes: { source: 'sportrz_admin', paymentRecordId: String(payment.id), adminUserId: actor.id } }),
    });
    const refundData = await refundResponse.json().catch(() => ({}));
    if (!refundResponse.ok) {
      console.error('Razorpay refund request failed:', { status: refundResponse.status, code: refundData?.error?.code, description: refundData?.error?.description });
      return NextResponse.json({ error: refundData?.error?.description || 'Razorpay did not accept the refund request.' }, { status: 502 });
    }
    if (String(refundData.status || '').toLowerCase() === 'processed') {
      const connection = await getPool().getConnection();
      try {
        await connection.beginTransaction();
        await connection.execute("UPDATE payments SET status = 'refunded', provider_payload = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?", [JSON.stringify({ refund: refundData }), payment.id]);
        await connection.execute("UPDATE subscriptions SET status = 'cancelled', updated_at = UTC_TIMESTAMP() WHERE payment_record_id = ? AND status = 'active'", [payment.id]);
        await connection.execute("UPDATE affiliate_commissions SET status = 'reversed', updated_at = UTC_TIMESTAMP() WHERE payment_record_id = ? AND status IN ('pending','approved')", [payment.id]);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally { connection.release(); }
    } else {
      await getPool().execute('UPDATE payments SET provider_payload = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [JSON.stringify({ refund: refundData }), payment.id]);
    }
    await logAdminAction(actor.id, 'payment.refund_requested', 'payment', payment.id, { orderId: payment.order_id, paymentId: payment.provider_payment_id, refundId: refundData.id || null, refundStatus: refundData.status || 'pending', amountPaise: Number(payment.amount_paise) }, request);
    return NextResponse.json({ success: true, refund: { id: refundData.id || null, status: refundData.status || 'pending', amountRupees: Number(refundData.amount ?? payment.amount_paise) / 100 }, message: String(refundData.status || '').toLowerCase() === 'processed' ? 'Refund processed successfully.' : 'Refund requested from Razorpay. Its status is not processed yet.' });
  } catch (error) {
    console.error('Admin refund request failed:', error);
    return NextResponse.json({ error: 'Unable to submit refund to Razorpay.' }, { status: 500 });
  }
}
