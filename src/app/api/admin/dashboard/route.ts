import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { getAdminPrincipal, hasPermission } from '@/lib/admin-access';

export const runtime = 'nodejs';
type Stat = { key: string; label: string; value: number; currency?: string; subvalue?: string };
type CurrencyAmount = RowDataPacket & { currency: string; amount_paise: number };

export async function GET() {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || !hasPermission(actor, 'dashboard.view')) return NextResponse.json({ error: 'Dashboard access required.' }, { status: 403 });
    const pool = getPool();
    const stats: Stat[] = [];

    if (actor.isAffiliate) {
      const [counts] = await pool.execute<Array<RowDataPacket & { referrals: number; paid_users: number }>>(
        `SELECT
          (SELECT COUNT(*) FROM affiliate_referrals ar WHERE ar.affiliate_user_id = ? AND ar.status = 'qualified') AS referrals,
          (SELECT COUNT(DISTINCT ar.referred_user_id) FROM affiliate_referrals ar JOIN payments p ON p.user_id = ar.referred_user_id AND p.status = 'captured' WHERE ar.affiliate_user_id = ? AND ar.status = 'qualified' AND COALESCE(p.paid_at, p.created_at) >= ar.created_at) AS paid_users`,
        [actor.id, actor.id],
      );
      const [revenues] = await pool.execute<CurrencyAmount[]>(
        `SELECT p.currency, SUM(p.amount_paise) AS amount_paise
         FROM affiliate_referrals ar JOIN payments p ON p.user_id = ar.referred_user_id AND p.status = 'captured'
         WHERE ar.affiliate_user_id = ? AND ar.status = 'qualified' AND COALESCE(p.paid_at, p.created_at) >= ar.created_at GROUP BY p.currency ORDER BY p.currency`, [actor.id],
      );
      const [commissions] = await pool.execute<Array<RowDataPacket & { currency: string; total_paise: number; pending_paise: number }>>(
        `SELECT p.currency,
          SUM(CASE WHEN ac.status <> 'reversed' THEN ac.commission_paise ELSE 0 END) AS total_paise,
          SUM(CASE WHEN ac.status IN ('pending','approved') THEN ac.commission_paise ELSE 0 END) AS pending_paise
         FROM affiliate_commissions ac JOIN payments p ON p.id = ac.payment_record_id
         WHERE ac.affiliate_user_id = ? GROUP BY p.currency ORDER BY p.currency`, [actor.id],
      );
      stats.push({ key: 'my_referrals', label: 'My referred users', value: Number(counts[0]?.referrals || 0) });
      stats.push({ key: 'my_conversions', label: 'Converted users', value: Number(counts[0]?.paid_users || 0) });
      for (const row of revenues) stats.push({ key: `my_revenue_${row.currency}`, label: `Attributed revenue (${row.currency})`, value: Number(row.amount_paise || 0) / 100, currency: row.currency });
      for (const row of commissions) stats.push({ key: `my_commission_${row.currency}`, label: `Earned commission (${row.currency})`, value: Number(row.total_paise || 0) / 100, currency: row.currency, subvalue: `${Number(row.pending_paise || 0) / 100} ${row.currency} pending / approved` });
      return NextResponse.json({ stats, scope: 'own-referrals-only' }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (hasPermission(actor, 'users.view')) {
      const [rows] = await pool.query<Array<RowDataPacket & { total_users: number; active_users: number; verified_users: number }>>(
        `SELECT COUNT(*) AS total_users, SUM(status = 'active' AND account_role = 'user') AS active_users,
          SUM(email_verified_at IS NOT NULL AND account_role = 'user') AS verified_users FROM users WHERE account_role = 'user'`,
      );
      stats.push({ key: 'users', label: 'Registered users', value: Number(rows[0]?.total_users || 0), subvalue: `${Number(rows[0]?.active_users || 0)} active · ${Number(rows[0]?.verified_users || 0)} verified` });
    }
    if (hasPermission(actor, 'subscriptions.view')) {
      const [rows] = await pool.query<Array<RowDataPacket & { active: number; expiring_soon: number }>>(
        `SELECT SUM(status = 'active' AND (end_at IS NULL OR end_at > UTC_TIMESTAMP())) AS active,
          SUM(status = 'active' AND end_at IS NOT NULL AND end_at BETWEEN UTC_TIMESTAMP() AND DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY)) AS expiring_soon FROM subscriptions`,
      );
      stats.push({ key: 'subscriptions', label: 'Active subscriptions', value: Number(rows[0]?.active || 0), subvalue: `${Number(rows[0]?.expiring_soon || 0)} expire within 7 days` });
    }
    if (hasPermission(actor, 'payments.view')) {
      const [totals] = await pool.query<Array<RowDataPacket & { currency: string; revenue_paise: number; captured: number; failed: number }>>(
        `SELECT currency,
          COALESCE(SUM(CASE WHEN status = 'captured' THEN amount_paise ELSE 0 END),0) AS revenue_paise,
          SUM(status = 'captured') AS captured, SUM(status = 'failed') AS failed
         FROM payments GROUP BY currency ORDER BY currency`,
      );
      for (const row of totals) stats.push({ key: `revenue_${row.currency}`, label: `Captured revenue (${row.currency})`, value: Number(row.revenue_paise || 0) / 100, currency: row.currency, subvalue: `${Number(row.captured || 0)} captured · ${Number(row.failed || 0)} failed` });
    }
    if (hasPermission(actor, 'games.manage')) {
      const [rows] = await pool.query<Array<RowDataPacket & { active_games: number; total_games: number }>>('SELECT COUNT(*) AS total_games, SUM(is_active = 1) AS active_games FROM games');
      stats.push({ key: 'games', label: 'Active games', value: Number(rows[0]?.active_games || 0), subvalue: `${Number(rows[0]?.total_games || 0)} total catalogue entries` });
    }
    if (hasPermission(actor, 'plans.manage')) {
      const [rows] = await pool.query<Array<RowDataPacket & { active_plans: number; total_plans: number }>>('SELECT COUNT(*) AS total_plans, SUM(is_active = 1) AS active_plans FROM plans');
      stats.push({ key: 'plans', label: 'Published plans', value: Number(rows[0]?.active_plans || 0), subvalue: `${Number(rows[0]?.total_plans || 0)} total plans` });
    }
    if (hasPermission(actor, 'affiliates.view')) {
      const [rows] = await pool.query<Array<RowDataPacket & { total_affiliates: number; referrals: number }>>(
        `SELECT (SELECT COUNT(*) FROM affiliate_profiles ap JOIN users u ON u.id = ap.user_id WHERE ap.status = 'active' AND u.account_role = 'affiliate') AS total_affiliates,
          (SELECT COUNT(*) FROM affiliate_referrals WHERE status = 'qualified') AS referrals`,
      );
      stats.push({ key: 'affiliates', label: 'Active affiliates', value: Number(rows[0]?.total_affiliates || 0), subvalue: `${Number(rows[0]?.referrals || 0)} referred users` });
      const [pendingTotals] = await pool.query<CurrencyAmount[]>(
        `SELECT p.currency, SUM(ac.commission_paise) AS amount_paise
         FROM affiliate_commissions ac JOIN payments p ON p.id = ac.payment_record_id
         WHERE ac.status IN ('pending','approved') GROUP BY p.currency ORDER BY p.currency`,
      );
      for (const row of pendingTotals) stats.push({ key: `affiliate_pending_${row.currency}`, label: `Affiliate commission pending (${row.currency})`, value: Number(row.amount_paise || 0) / 100, currency: row.currency });
    }
    if (hasPermission(actor, 'messages.view')) {
      const [rows] = await pool.query<Array<RowDataPacket & { unread: number }>>("SELECT COUNT(*) AS unread FROM contact_messages WHERE status = 'unread'");
      stats.push({ key: 'messages', label: 'Unread enquiries', value: Number(rows[0]?.unread || 0) });
    }
    if (hasPermission(actor, 'feedback.view')) {
      const [rows] = await pool.query<Array<RowDataPacket & { feedback_count: number; reviews_count: number }>>(
        'SELECT (SELECT COUNT(*) FROM feedback) AS feedback_count, (SELECT COUNT(*) FROM reviews) AS reviews_count',
      );
      stats.push({ key: 'feedback', label: 'Feedback & reviews', value: Number(rows[0]?.feedback_count || 0) + Number(rows[0]?.reviews_count || 0), subvalue: `${Number(rows[0]?.feedback_count || 0)} feedback · ${Number(rows[0]?.reviews_count || 0)} reviews` });
    }
    return NextResponse.json({ stats, scope: 'granted-permissions' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Admin dashboard API failed:', error);
    return NextResponse.json({ error: 'Unable to load dashboard statistics.' }, { status: 500 });
  }
}
