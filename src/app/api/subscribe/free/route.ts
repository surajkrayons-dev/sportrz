import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { getCurrentUser } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let connection: Awaited<ReturnType<ReturnType<typeof getPool>['getConnection']>> | null = null;
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in with email OTP before selecting a plan.' }, { status: 401 });
    const body = await request.json();
    const planCode = String(body.planCode || '').trim().toLowerCase();
    if (!planCode || planCode.length > 50) return NextResponse.json({ error: 'Choose a valid plan.' }, { status: 400 });
    connection = await getPool().getConnection();
    await connection.beginTransaction();
    const [users] = await connection.execute<Array<RowDataPacket & { status: string }>>('SELECT status FROM users WHERE id = ? LIMIT 1 FOR UPDATE', [user.uid]);
    if (!users[0] || users[0].status !== 'active') { await connection.rollback(); return NextResponse.json({ error: 'Your account is not active.' }, { status: 403 }); }
    const [plans] = await connection.execute<Array<RowDataPacket & { id: number; code: string; name: string; price_paise: number; currency: string; duration_days: number | null; is_active: number }>>(
      'SELECT id, code, name, price_paise, currency, duration_days, is_active FROM plans WHERE code = ? LIMIT 1 FOR UPDATE', [planCode],
    );
    const plan = plans[0];
    if (!plan || !Boolean(plan.is_active)) { await connection.rollback(); return NextResponse.json({ error: 'This plan is not currently available.' }, { status: 404 }); }
    if (Number(plan.price_paise) !== 0) { await connection.rollback(); return NextResponse.json({ error: 'This plan requires a paid checkout.' }, { status: 409 }); }

    const [current] = await connection.execute<Array<RowDataPacket & { id: number }>>(
      `SELECT id FROM subscriptions WHERE user_id = ? AND plan_id = ? AND status = 'active'
       AND (end_at IS NULL OR end_at > UTC_TIMESTAMP()) ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [user.uid, plan.id],
    );
    if (current[0]) {
      await connection.commit();
      return NextResponse.json({ success: true, alreadyActive: true, plan: { code: plan.code, name: plan.name, durationDays: plan.duration_days } });
    }

    await connection.execute(
      `UPDATE subscriptions SET status = 'expired', updated_at = UTC_TIMESTAMP()
       WHERE user_id = ? AND status = 'active' AND end_at IS NOT NULL AND end_at <= UTC_TIMESTAMP()`, [user.uid],
    );
    await connection.execute("UPDATE subscriptions SET status = 'cancelled', updated_at = UTC_TIMESTAMP() WHERE user_id = ? AND status = 'active'", [user.uid]);
    const durationDays = plan.duration_days == null ? null : Number(plan.duration_days);
    await connection.execute(
      `INSERT INTO subscriptions (user_id, plan_id, payment_record_id, status, source, start_at, end_at)
       VALUES (?, ?, NULL, 'active', 'purchase', UTC_TIMESTAMP(), ${durationDays === null ? 'NULL' : 'DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY)'})`,
      durationDays === null ? [user.uid, plan.id] : [user.uid, plan.id, durationDays],
    );
    await connection.commit();
    return NextResponse.json({ success: true, plan: { code: plan.code, name: plan.name, durationDays } }, { status: 201 });
  } catch (error) {
    if (connection) { try { await connection.rollback(); } catch { /* ignore rollback failures */ } }
    console.error('Free plan subscription failed:', error);
    return NextResponse.json({ error: 'Unable to activate this free plan.' }, { status: 500 });
  } finally { connection?.release(); }
}
