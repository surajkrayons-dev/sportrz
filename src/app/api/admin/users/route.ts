import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { getAdminPrincipal, hasPermission } from '@/lib/admin-access';
import { logAdminAction } from '@/lib/admin-audit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || (!hasPermission(actor, 'users.view') && !actor.isAffiliate)) return NextResponse.json({ error: 'You do not have permission to view users.' }, { status: 403 });
    const params = request.nextUrl.searchParams;
    const search = (params.get('q') || '').trim().slice(0, 120);
    const status = params.get('status') || 'all';
    const role = params.get('role') || 'all';
    const pageRaw = Number(params.get('page') || 1);
    const sizeRaw = Number(params.get('pageSize') || 25);
    const page = Number.isSafeInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const pageSize = Number.isSafeInteger(sizeRaw) ? Math.min(100, Math.max(10, sizeRaw)) : 25;
    const values: Array<string | number | null> = [];
    const conditions: string[] = ['1=1'];
    if (actor.isAffiliate) {
      conditions.push('ar.affiliate_user_id = ?'); values.push(actor.id);
    }
    if (search) { conditions.push('(u.email LIKE ? OR u.display_name LIKE ? OR u.id LIKE ?)'); values.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (status === 'active' || status === 'suspended') { conditions.push('u.status = ?'); values.push(status); }
    if (!actor.isAffiliate && role !== 'all' && ['user','super_admin','subadmin','affiliate'].includes(role)) { conditions.push('u.account_role = ?'); values.push(role); }
    const join = actor.isAffiliate ? 'INNER JOIN affiliate_referrals ar ON ar.referred_user_id = u.id' : 'LEFT JOIN affiliate_referrals ar ON ar.referred_user_id = u.id';
    const where = conditions.join(' AND ');
    const pool = getPool();
    const [countRows] = await pool.execute<Array<RowDataPacket & { total: number }>>(
      `SELECT COUNT(DISTINCT u.id) AS total FROM users u ${join} WHERE ${where}`, values,
    );
    const [rows] = await pool.execute<Array<RowDataPacket & {
      id: string; email: string; display_name: string | null; account_role: string; status: string; created_at: Date | string;
      last_login_at: Date | string | null; email_verified_at: Date | string | null; referral_code: string | null; active_subscription: string | null;
    }>>(
      `SELECT u.id, u.email, u.display_name, u.account_role, u.status, u.created_at, u.last_login_at, u.email_verified_at,
        af.referral_code,
        (SELECT pl.code FROM subscriptions s INNER JOIN plans pl ON pl.id = s.plan_id WHERE s.user_id = u.id AND s.status = 'active' AND (s.end_at IS NULL OR s.end_at > UTC_TIMESTAMP()) ORDER BY s.end_at DESC LIMIT 1) AS active_subscription
       FROM users u ${join}
       LEFT JOIN affiliate_referrals ar2 ON ar2.referred_user_id = u.id
       LEFT JOIN affiliate_profiles af ON af.user_id = ar2.affiliate_user_id
       WHERE ${where}
       GROUP BY u.id, u.email, u.display_name, u.account_role, u.status, u.created_at, u.last_login_at, u.email_verified_at, af.referral_code
       ORDER BY u.created_at DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      values,
    );
    const spendMap = new Map<string, Array<{ currency: string; amount: number }>>();
    const rowIds = rows.map((row) => row.id);
    if (rowIds.length) {
      const [spendRows] = await pool.execute<Array<RowDataPacket & { user_id: string; currency: string; total_paise: number }>>(
        `SELECT user_id, currency, SUM(amount_paise) AS total_paise FROM payments WHERE status = 'captured' AND user_id IN (${rowIds.map(() => '?').join(',')}) GROUP BY user_id, currency`, rowIds,
      );
      for (const spend of spendRows) {
        const items = spendMap.get(spend.user_id) || [];
        items.push({ currency: spend.currency || 'INR', amount: Number(spend.total_paise || 0) / 100 });
        spendMap.set(spend.user_id, items);
      }
    }
    return NextResponse.json({
      users: rows.map((row) => ({
        id: row.id, email: row.email, displayName: row.display_name || '', role: row.account_role, status: row.status,
        createdAt: row.created_at, lastLoginAt: row.last_login_at, verified: Boolean(row.email_verified_at),
        referralCode: actor.isAffiliate ? undefined : row.referral_code,
        activeSubscription: row.active_subscription, totalSpendByCurrency: spendMap.get(row.id) || [],
      })),
      pagination: { page, pageSize, total: Number(countRows[0]?.total || 0), pages: Math.ceil(Number(countRows[0]?.total || 0) / pageSize) },
      scope: actor.isAffiliate ? 'own-referrals-only' : 'all-users',
    });
  } catch (error) {
    console.error('Admin users API failed:', error);
    return NextResponse.json({ error: 'Unable to load users. Run the admin migration if this is a fresh setup.' }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || !hasPermission(actor, 'users.manage')) return NextResponse.json({ error: 'User management permission required.' }, { status: 403 });
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const displayName = String(body.displayName || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    if (displayName.length > 191) return NextResponse.json({ error: 'Display name must be 191 characters or fewer.' }, { status: 400 });
    const id = randomUUID();
    await getPool().execute(
      `INSERT INTO users (id, email, display_name, is_admin, account_role, status, email_verified_at)
       VALUES (?, ?, ?, 0, 'user', 'active', NULL)`, [id, email, displayName || email.split('@')[0]],
    );
    await logAdminAction(actor.id, 'user.created', 'user', id, { email, displayName: displayName || null, createdByAdmin: true }, request);
    return NextResponse.json({ success: true, userId: id, message: 'User created. They can activate their account by verifying an email OTP.' }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    console.error('Admin user create failed:', error);
    return NextResponse.json({ error: 'Unable to create user.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  let connection: Awaited<ReturnType<ReturnType<typeof getPool>['getConnection']>> | null = null;
  try {
    const actor = await getAdminPrincipal();
    if (!actor || !hasPermission(actor, 'users.manage')) return NextResponse.json({ error: 'User management permission required.' }, { status: 403 });
    const body = await request.json();
    const id = String(body.id || '');
    if (!id || id.length > 36 || id === actor.id) return NextResponse.json({ error: 'Select a valid user to delete.' }, { status: 400 });
    const pool = getPool(); connection = await pool.getConnection(); await connection.beginTransaction();
    const [userRows] = await connection.execute<Array<RowDataPacket & { email: string; account_role: string }>>('SELECT email, account_role FROM users WHERE id = ? LIMIT 1 FOR UPDATE', [id]);
    const user = userRows[0];
    if (!user) { await connection.rollback(); return NextResponse.json({ error: 'User not found.' }, { status: 404 }); }
    if (user.account_role !== 'user') { await connection.rollback(); return NextResponse.json({ error: 'Team members and affiliates cannot be deleted from User management. Disable them through Team & access instead.' }, { status: 409 }); }
    const [checks] = await connection.execute<Array<RowDataPacket & { payments: number; subscriptions: number; referrals: number; commissions: number }>>(
      `SELECT
        (SELECT COUNT(*) FROM payments WHERE user_id = ?) AS payments,
        (SELECT COUNT(*) FROM subscriptions WHERE user_id = ?) AS subscriptions,
        (SELECT COUNT(*) FROM affiliate_referrals WHERE referred_user_id = ? OR affiliate_user_id = ?) AS referrals,
        (SELECT COUNT(*) FROM affiliate_commissions WHERE referred_user_id = ? OR affiliate_user_id = ?) AS commissions`,
      [id, id, id, id, id, id],
    );
    const summary = checks[0];
    if ([summary.payments, summary.subscriptions, summary.referrals, summary.commissions].some((v) => Number(v) > 0)) {
      await connection.rollback();
      return NextResponse.json({ error: 'This account has payment, subscription, or affiliate history. Suspend it instead to preserve financial and attribution records.' }, { status: 409 });
    }
    await connection.execute('DELETE FROM users WHERE id = ?', [id]);
    await connection.commit();
    await logAdminAction(actor.id, 'user.deleted', 'user', id, { email: user.email, reason: 'No financial, subscription, or affiliate history' }, request);
    return NextResponse.json({ success: true, message: 'User permanently deleted.' });
  } catch (error) {
    if (connection) { try { await connection.rollback(); } catch { /* ignore rollback failures */ } }
    console.error('Admin user delete failed:', error);
    return NextResponse.json({ error: 'Unable to delete this user.' }, { status: 500 });
  } finally { connection?.release(); }
}
