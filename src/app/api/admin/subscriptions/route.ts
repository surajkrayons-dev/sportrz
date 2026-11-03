import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { getAdminPrincipal, hasPermission } from '@/lib/admin-access';
import { logAdminAction } from '@/lib/admin-audit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || !hasPermission(actor, 'subscriptions.view')) return NextResponse.json({ error: 'Subscription viewing access required.' }, { status: 403 });
    const status = request.nextUrl.searchParams.get('status') || 'all';
    const values: Array<string | number | null> = [];
    const where: string[] = ['1=1'];
    if (status !== 'all' && ['pending','active','expired','cancelled'].includes(status)) { where.push('s.status = ?'); values.push(status); }
    const [rows] = await getPool().execute<Array<RowDataPacket & { id: number; user_id: string; email: string; display_name: string | null; plan_code: string; plan_name: string; status: string; source: string; start_at: Date | string | null; end_at: Date | string | null; assigned_email: string | null; created_at: Date | string }>>(
      `SELECT s.id, s.user_id, u.email, u.display_name, pl.code AS plan_code, pl.name AS plan_name, s.status, s.source, s.start_at, s.end_at, au.email AS assigned_email, s.created_at
       FROM subscriptions s JOIN users u ON u.id = s.user_id JOIN plans pl ON pl.id = s.plan_id
       LEFT JOIN users au ON au.id = s.assigned_by_admin_id WHERE ${where.join(' AND ')} ORDER BY s.created_at DESC LIMIT 500`, values,
    );
    return NextResponse.json({ subscriptions: rows.map((r) => ({ id: Number(r.id), userId: r.user_id, email: r.email, displayName: r.display_name || '', planCode: r.plan_code, planName: r.plan_name,
      status: r.status, source: r.source, startAt: r.start_at, endAt: r.end_at, assignedBy: r.assigned_email, createdAt: r.created_at })) });
  } catch (error) { console.error('Admin subscriptions list failed:', error); return NextResponse.json({ error: 'Unable to load subscriptions.' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  let connection: Awaited<ReturnType<ReturnType<typeof getPool>['getConnection']>> | null = null;
  try {
    const actor = await getAdminPrincipal();
    if (!actor || !hasPermission(actor, 'subscriptions.manage')) return NextResponse.json({ error: 'Subscription management access required.' }, { status: 403 });
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const planCode = String(body.planCode || '').trim().toLowerCase();
    const days = body.durationDays == null || body.durationDays === '' ? null : Number(body.durationDays);
    if (!email || email.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[a-z0-9_-]{1,50}$/.test(planCode)) return NextResponse.json({ error: 'Enter a valid user email and plan.' }, { status: 400 });
    if (days != null && (!Number.isInteger(days) || days < 1 || days > 3650)) return NextResponse.json({ error: 'Duration must be from 1 to 3650 days.' }, { status: 400 });
    const pool = getPool();
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [users] = await connection.execute<Array<RowDataPacket & { id: string }>>('SELECT id FROM users WHERE email = ? AND status = \'active\' LIMIT 1 FOR UPDATE', [email]);
    const [plans] = await connection.execute<Array<RowDataPacket & { id: number; duration_days: number | null }>>('SELECT id, duration_days FROM plans WHERE code = ? LIMIT 1', [planCode]);
    if (!users.length) { await connection.rollback(); return NextResponse.json({ error: 'No active user exists with that email.' }, { status: 404 }); }
    if (!plans.length) { await connection.rollback(); return NextResponse.json({ error: 'Plan not found.' }, { status: 404 }); }
    const duration = days ?? (plans[0].duration_days == null ? null : Number(plans[0].duration_days));
    await connection.execute(`UPDATE subscriptions SET status = 'cancelled', updated_at = UTC_TIMESTAMP() WHERE user_id = ? AND status = 'active'`, [users[0].id]);
    await connection.execute(
      `INSERT INTO subscriptions (user_id, plan_id, status, source, start_at, end_at, assigned_by_admin_id)
       VALUES (?, ?, 'active', 'admin', UTC_TIMESTAMP(), ${duration == null ? 'NULL' : 'DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY)'}, ?)`,
      duration == null ? [users[0].id, plans[0].id, actor.id] : [users[0].id, plans[0].id, duration, actor.id],
    );
    await connection.commit();
    await logAdminAction(actor.id, 'subscription.assigned', 'subscription', null, { userId: users[0].id, email, planCode, durationDays: duration }, request);
    return NextResponse.json({ success: true, message: 'Subscription assigned successfully.' }, { status: 201 });
  } catch (error) {
    if (connection) { try { await connection.rollback(); } catch { /* ignore */ } }
    console.error('Admin subscription assign failed:', error);
    return NextResponse.json({ error: 'Unable to assign subscription.' }, { status: 500 });
  } finally { connection?.release(); }
}

export async function PATCH(request: NextRequest) {
  let connection: Awaited<ReturnType<ReturnType<typeof getPool>['getConnection']>> | null = null;
  try {
    const actor = await getAdminPrincipal();
    if (!actor || !hasPermission(actor, 'subscriptions.manage')) return NextResponse.json({ error: 'Subscription management access required.' }, { status: 403 });
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Select a valid subscription.' }, { status: 400 });
    const pool = getPool(); connection = await pool.getConnection(); await connection.beginTransaction();
    const [currentRows] = await connection.execute<Array<RowDataPacket & { id: number; status: string; plan_id: number }>>('SELECT id, status, plan_id FROM subscriptions WHERE id = ? FOR UPDATE', [id]);
    if (!currentRows.length) { await connection.rollback(); return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 }); }
    const current = currentRows[0];
    if (body.status !== undefined) {
      const status = String(body.status);
      if (!['cancelled', 'active', 'expired', 'pending'].includes(status)) { await connection.rollback(); return NextResponse.json({ error: 'Invalid subscription status.' }, { status: 400 }); }
      await connection.execute('UPDATE subscriptions SET status = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [status, id]);
      await connection.commit(); await logAdminAction(actor.id, 'subscription.status_updated', 'subscription', id, { from: current.status, status }, request);
      return NextResponse.json({ success: true, message: 'Subscription status updated.' });
    }
    const planCode = String(body.planCode || '').trim().toLowerCase();
    const rawDays = body.durationDays;
    const days = rawDays === '' || rawDays === null || rawDays === undefined ? null : Number(rawDays);
    if (!/^[a-z0-9_-]{1,50}$/.test(planCode)) { await connection.rollback(); return NextResponse.json({ error: 'Choose a valid plan.' }, { status: 400 }); }
    if (days !== null && (!Number.isInteger(days) || days < 1 || days > 3650)) { await connection.rollback(); return NextResponse.json({ error: 'Duration must be 1–3650 days, or blank for no expiry.' }, { status: 400 }); }
    const [planRows] = await connection.execute<Array<RowDataPacket & { id: number; duration_days: number | null }>>('SELECT id, duration_days FROM plans WHERE code = ? LIMIT 1', [planCode]);
    if (!planRows.length) { await connection.rollback(); return NextResponse.json({ error: 'Plan not found.' }, { status: 404 }); }
    const duration = rawDays === undefined ? planRows[0].duration_days : days;
    await connection.execute(`UPDATE subscriptions SET plan_id = ?, end_at = ${duration === null ? 'NULL' : 'DATE_ADD(COALESCE(start_at, UTC_TIMESTAMP()), INTERVAL ? DAY)'}, updated_at = UTC_TIMESTAMP() WHERE id = ?`, duration === null ? [planRows[0].id, id] : [planRows[0].id, duration, id]);
    await connection.commit(); await logAdminAction(actor.id, 'subscription.updated', 'subscription', id, { previousPlanId: current.plan_id, planCode, durationDays: duration }, request);
    return NextResponse.json({ success: true, message: 'Subscription updated successfully.' });
  } catch (error) {
    if (connection) { try { await connection.rollback(); } catch { /* ignore */ } }
    console.error('Admin subscription update failed:', error); return NextResponse.json({ error: 'Unable to update subscription.' }, { status: 500 });
  } finally { connection?.release(); }
}
