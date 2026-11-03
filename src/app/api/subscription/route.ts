import { NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import { getCurrentUser } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ subscription: null });
    const pool = getPool();
    await pool.execute(
      `UPDATE subscriptions SET status = 'expired', updated_at = UTC_TIMESTAMP()
       WHERE user_id = ? AND status = 'active' AND end_at IS NOT NULL AND end_at <= UTC_TIMESTAMP()`,
      [user.uid],
    );
    const [rows] = await pool.execute<any[]>(
      `SELECT s.id, s.start_at, s.end_at, s.status, pl.code AS plan_code,
              p.provider_payment_id, p.order_id
       FROM subscriptions s
       INNER JOIN plans pl ON pl.id = s.plan_id
       LEFT JOIN payments p ON p.id = s.payment_record_id
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC, s.id DESC LIMIT 1`,
      [user.uid],
    );
    const row = rows[0];
    if (!row) return NextResponse.json({ subscription: null });
    const endDate = row.end_at ? new Date(row.end_at) : null;
    const isActive = row.status === 'active' && (!endDate || (Number.isFinite(endDate.getTime()) && endDate.getTime() > Date.now()));
    return NextResponse.json({
      subscription: {
        plan: row.plan_code,
        startDate: row.start_at ? new Date(row.start_at).toISOString() : null,
        endDate: row.end_at ? new Date(row.end_at).toISOString() : null,
        paymentId: row.provider_payment_id || undefined,
        orderId: row.order_id || undefined,
        isActive,
        autoRenew: false,
      },
    });
  } catch (error) {
    console.error('Subscription query failed:', error);
    return NextResponse.json({ error: 'Unable to load subscription status.' }, { status: 500 });
  }
}
