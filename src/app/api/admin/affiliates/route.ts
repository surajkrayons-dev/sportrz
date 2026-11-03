import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { getAdminPrincipal, hasPermission } from '@/lib/admin-access';
import { logAdminAction } from '@/lib/admin-audit';

export const runtime = 'nodejs';
const appOrigin = () => { const configured = process.env.NEXT_PUBLIC_APP_URL; const fallback = process.env.NODE_ENV === 'production' ? 'https://sportrz.com' : 'http://localhost:3000'; const candidate = configured && !/^https?:\/\/localhost(?::\d+)?$/i.test(configured) ? configured : fallback; return candidate.replace(/\/$/, ''); };
const makeReferralCode = () => `SP-${randomBytes(5).toString('hex').toUpperCase()}`;

async function uniqueReferralCode(executor: { execute: Function }): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = makeReferralCode();
    const [rows] = await executor.execute('SELECT user_id FROM affiliate_profiles WHERE referral_code = ? LIMIT 1', [code]);
    if (!(rows as unknown[]).length) return code;
  }
  throw new Error('Unable to generate a unique affiliate referral code.');
}

export async function GET() {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || (!actor.isAffiliate && !hasPermission(actor, 'affiliates.view'))) return NextResponse.json({ error: 'Affiliate access required.' }, { status: 403 });
    const pool = getPool();

    // Affiliate views are deliberately scoped by the authenticated session user ID.
    if (actor.isAffiliate) {
      const [profileRows] = await pool.execute<Array<RowDataPacket & { referral_code: string; commission_percent: number; status: string; payout_email: string | null; affiliate_type: string; website_url: string | null }>>(
        "SELECT ap.referral_code, ap.commission_percent, ap.status, ap.payout_email, ap.affiliate_type, ap.website_url FROM affiliate_profiles ap JOIN users u ON u.id = ap.user_id WHERE ap.user_id = ? AND u.account_role = 'affiliate' LIMIT 1", [actor.id],
      );
      const profile = profileRows[0];
      if (!profile) return NextResponse.json({ affiliate: null, referrals: [], commissions: [], scope: 'own-referrals-only' });
      const [referrals] = await pool.execute<Array<RowDataPacket & { id: string; email: string; display_name: string | null; created_at: Date | string; active_subscription: string | null; captured_payments: number }>>(
        `SELECT u.id, u.email, u.display_name, ar.created_at,
          (SELECT pl.code FROM subscriptions s JOIN plans pl ON pl.id = s.plan_id WHERE s.user_id = u.id AND s.status = 'active' AND (s.end_at IS NULL OR s.end_at > UTC_TIMESTAMP()) ORDER BY s.end_at DESC LIMIT 1) AS active_subscription,
          (SELECT COUNT(*) FROM payments p WHERE p.user_id = u.id AND p.status = 'captured' AND COALESCE(p.paid_at, p.created_at) >= ar.created_at) AS captured_payments
         FROM affiliate_referrals ar JOIN users u ON u.id = ar.referred_user_id
         WHERE ar.affiliate_user_id = ? AND ar.status = 'qualified'
         ORDER BY ar.created_at DESC`, [actor.id],
      );
      const [revenueRows] = await pool.execute<Array<RowDataPacket & { user_id: string; currency: string; amount_paise: number }>>(
        `SELECT ar.referred_user_id AS user_id, p.currency, SUM(p.amount_paise) AS amount_paise
         FROM affiliate_referrals ar JOIN payments p ON p.user_id = ar.referred_user_id AND p.status = 'captured'
         WHERE ar.affiliate_user_id = ? AND ar.status = 'qualified' AND COALESCE(p.paid_at, p.created_at) >= ar.created_at
         GROUP BY ar.referred_user_id, p.currency`, [actor.id],
      );
      const revenueMap = new Map<string, Array<{ currency: string; amount: number }>>();
      for (const row of revenueRows) {
        const values = revenueMap.get(row.user_id) || [];
        values.push({ currency: row.currency || 'INR', amount: Number(row.amount_paise || 0) / 100 });
        revenueMap.set(row.user_id, values);
      }
      const [commissionRows] = await pool.execute<Array<RowDataPacket & { status: string; currency: string; total_paise: number; count: number }>>(
        `SELECT ac.status, p.currency, SUM(ac.commission_paise) AS total_paise, COUNT(*) AS count
         FROM affiliate_commissions ac JOIN payments p ON p.id = ac.payment_record_id
         WHERE ac.affiliate_user_id = ? GROUP BY ac.status, p.currency ORDER BY ac.status, p.currency`, [actor.id],
      );
      const origin = appOrigin();
      return NextResponse.json({
        affiliate: { ...profile, commission_percent: Number(profile.commission_percent), referral_url: `${origin}/login?ref=${encodeURIComponent(profile.referral_code)}` },
        referrals: referrals.map((r) => ({ id: r.id, email: r.email, displayName: r.display_name || '', referredAt: r.created_at, activeSubscription: r.active_subscription, capturedPayments: Number(r.captured_payments || 0), revenueByCurrency: revenueMap.get(r.id) || [] })),
        commissions: commissionRows.map((r) => ({ status: r.status, currency: r.currency || 'INR', amount: Number(r.total_paise || 0) / 100, count: Number(r.count || 0) })),
        scope: 'own-referrals-only',
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const [rows] = await pool.query<Array<RowDataPacket & { user_id: string; email: string; display_name: string | null; referral_code: string; commission_percent: number; affiliate_status: string; affiliate_type: string; website_url: string | null; created_at: Date | string; referral_count: number; converted_count: number }>>(
      `SELECT u.id AS user_id, u.email, u.display_name, ap.referral_code, ap.commission_percent,
        ap.status AS affiliate_status, ap.affiliate_type, ap.website_url, ap.created_at,
        (SELECT COUNT(*) FROM affiliate_referrals ar WHERE ar.affiliate_user_id = ap.user_id AND ar.status = 'qualified') AS referral_count,
        (SELECT COUNT(DISTINCT ar.referred_user_id) FROM affiliate_referrals ar JOIN payments p ON p.user_id = ar.referred_user_id AND p.status = 'captured' WHERE ar.affiliate_user_id = ap.user_id AND ar.status = 'qualified' AND COALESCE(p.paid_at, p.created_at) >= ar.created_at) AS converted_count
       FROM affiliate_profiles ap JOIN users u ON u.id = ap.user_id WHERE u.account_role = 'affiliate' ORDER BY ap.created_at DESC`,
    );
    const [totals] = await pool.query<Array<RowDataPacket & { affiliate_user_id: string; currency: string; total_paise: number; pending_paise: number }>>(
      `SELECT ac.affiliate_user_id, p.currency,
        SUM(CASE WHEN ac.status <> 'reversed' THEN ac.commission_paise ELSE 0 END) AS total_paise,
        SUM(CASE WHEN ac.status IN ('pending','approved') THEN ac.commission_paise ELSE 0 END) AS pending_paise
       FROM affiliate_commissions ac JOIN payments p ON p.id = ac.payment_record_id
       GROUP BY ac.affiliate_user_id, p.currency`,
    );
    const totalsMap = new Map<string, Array<{ currency: string; total: number; pending: number }>>();
    for (const row of totals) {
      const values = totalsMap.get(row.affiliate_user_id) || [];
      values.push({ currency: row.currency || 'INR', total: Number(row.total_paise || 0) / 100, pending: Number(row.pending_paise || 0) / 100 });
      totalsMap.set(row.affiliate_user_id, values);
    }
    const [ledgerRows] = await pool.query<Array<RowDataPacket & { id: number; affiliate_email: string; affiliate_name: string | null; referred_email: string; amount_paise: number; commission_percent: number; commission_paise: number; currency: string; status: string; payment_record_id: number; created_at: Date | string }>>(
      `SELECT ac.id, au.email AS affiliate_email, au.display_name AS affiliate_name, ru.email AS referred_email,
        ac.amount_paise, ac.commission_percent, ac.commission_paise, p.currency, ac.status, ac.payment_record_id, ac.created_at
       FROM affiliate_commissions ac JOIN payments p ON p.id = ac.payment_record_id JOIN users au ON au.id = ac.affiliate_user_id JOIN users ru ON ru.id = ac.referred_user_id
       ORDER BY ac.created_at DESC LIMIT 500`,
    );
    const [applications] = await pool.query<Array<RowDataPacket & { id: number; user_id: string; email: string; display_name: string | null; website_url: string; status: string; review_note: string | null; created_at: Date | string }>>(
      `SELECT aa.id, aa.user_id, u.email, u.display_name, aa.website_url, aa.status, aa.review_note, aa.created_at
       FROM affiliate_applications aa JOIN users u ON u.id = aa.user_id
       WHERE aa.status = 'pending' AND u.account_role = 'user' AND u.status = 'active'
       ORDER BY aa.created_at ASC LIMIT 200`,
    );
    const origin = appOrigin();
    return NextResponse.json({
      affiliates: rows.map((row) => ({ userId: row.user_id, email: row.email, displayName: row.display_name || '', referralCode: row.referral_code,
        affiliateType: row.affiliate_type || 'admin_created', websiteUrl: row.website_url || '', commissionPercent: Number(row.commission_percent), status: row.affiliate_status, createdAt: row.created_at,
        referralCount: Number(row.referral_count || 0), convertedCount: Number(row.converted_count || 0), commissionByCurrency: totalsMap.get(row.user_id) || [],
        referralUrl: `${origin}/login?ref=${encodeURIComponent(row.referral_code)}` })),
      commissionLedger: ledgerRows.map((row) => ({ id: Number(row.id), affiliateEmail: row.affiliate_email, affiliateName: row.affiliate_name || '', referredEmail: row.referred_email,
        amount: Number(row.amount_paise || 0) / 100, currency: row.currency || 'INR', commissionPercent: Number(row.commission_percent || 0), commission: Number(row.commission_paise || 0) / 100,
        status: row.status, paymentRecordId: Number(row.payment_record_id), createdAt: row.created_at })),
      applications: applications.map((row) => ({ id: Number(row.id), userId: row.user_id, email: row.email, displayName: row.display_name || '', websiteUrl: row.website_url, status: row.status, reviewNote: row.review_note, createdAt: row.created_at })),
      scope: 'all-affiliates',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Affiliates API failed:', error);
    return NextResponse.json({ error: 'Unable to load affiliate information. Run the external affiliate migration if needed.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  let connection: Awaited<ReturnType<ReturnType<typeof getPool>['getConnection']>> | null = null;
  try {
    const actor = await getAdminPrincipal();
    if (!actor || actor.isAffiliate || (!actor.isSuperAdmin && !hasPermission(actor, 'affiliates.manage'))) return NextResponse.json({ error: 'Affiliate management access required.' }, { status: 403 });
    const body = await request.json();

    if (body.applicationId !== undefined) {
      const applicationId = Number(body.applicationId);
      const applicationAction = String(body.applicationAction || '');
      if (!Number.isSafeInteger(applicationId) || applicationId < 1 || !['approve', 'reject'].includes(applicationAction)) return NextResponse.json({ error: 'Choose a valid affiliate application action.' }, { status: 400 });
      const commissionPercent = body.commissionPercent === undefined ? 10 : Number(body.commissionPercent);
      if (applicationAction === 'approve' && (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100)) return NextResponse.json({ error: 'Commission must be between 0 and 100 percent.' }, { status: 400 });
      connection = await getPool().getConnection();
      await connection.beginTransaction();
      const [appRows] = await connection.execute<Array<RowDataPacket & { id: number; user_id: string; email: string; website_url: string; status: string; account_role: string; user_status: string }>>(
        `SELECT aa.id, aa.user_id, u.email, aa.website_url, aa.status, u.account_role, u.status AS user_status
         FROM affiliate_applications aa JOIN users u ON u.id = aa.user_id WHERE aa.id = ? LIMIT 1 FOR UPDATE`, [applicationId],
      );
      const app = appRows[0];
      if (!app) { await connection.rollback(); return NextResponse.json({ error: 'Affiliate application not found.' }, { status: 404 }); }
      if (app.status !== 'pending') { await connection.rollback(); return NextResponse.json({ error: 'This application has already been reviewed.' }, { status: 409 }); }
      if (applicationAction === 'reject') {
        const reviewNote = String(body.reviewNote || '').trim().slice(0, 512) || null;
        await connection.execute("UPDATE affiliate_applications SET status = 'rejected', review_note = ?, reviewed_by_admin_id = ?, reviewed_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = ?", [reviewNote, actor.id, applicationId]);
        await connection.commit();
        await logAdminAction(actor.id, 'affiliate.application_rejected', 'affiliate_application', applicationId, { userId: app.user_id, websiteUrl: app.website_url, reviewNote }, request);
        return NextResponse.json({ success: true, message: 'Affiliate application rejected.' });
      }
      if (app.user_status !== 'active' || app.account_role !== 'user') { await connection.rollback(); return NextResponse.json({ error: 'Only an active regular-user account can be approved.' }, { status: 409 }); }
      const code = await uniqueReferralCode(connection);
      await connection.execute("UPDATE users SET account_role = 'affiliate', is_admin = 1, updated_at = UTC_TIMESTAMP() WHERE id = ?", [app.user_id]);
      await connection.execute('DELETE FROM admin_user_permissions WHERE user_id = ?', [app.user_id]);
      await connection.execute(
        `INSERT INTO affiliate_profiles (user_id, referral_code, commission_percent, payout_email, status, affiliate_type, website_url)
         VALUES (?, ?, ?, ?, 'active', 'external_website', ?)`, [app.user_id, code, commissionPercent, app.email, app.website_url],
      );
      await connection.execute("UPDATE affiliate_applications SET status = 'approved', review_note = NULL, reviewed_by_admin_id = ?, reviewed_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = ?", [actor.id, applicationId]);
      await connection.commit();
      await logAdminAction(actor.id, 'affiliate.application_approved', 'affiliate_application', applicationId, { userId: app.user_id, websiteUrl: app.website_url, commissionPercent, referralCode: code }, request);
      return NextResponse.json({ success: true, message: 'Affiliate approved. Their unique referral link is now available in their affiliate dashboard.' });
    }

    if (body.userId) {
      const userId = String(body.userId);
      if (!userId || userId.length > 36) return NextResponse.json({ error: 'Select a valid affiliate.' }, { status: 400 });
      const [profiles] = await getPool().execute<Array<RowDataPacket & { commission_percent: number; status: string; affiliate_type: string; website_url: string | null }>>(
        "SELECT ap.commission_percent, ap.status, ap.affiliate_type, ap.website_url FROM affiliate_profiles ap JOIN users u ON u.id = ap.user_id WHERE ap.user_id = ? AND u.account_role = 'affiliate' LIMIT 1", [userId],
      );
      if (!profiles.length) return NextResponse.json({ error: 'Affiliate profile not found.' }, { status: 404 });
      const updates: string[] = [];
      const values: Array<string | number | null> = [];
      const details: Record<string, unknown> = {};
      if (body.commissionPercent !== undefined) {
        const rate = Number(body.commissionPercent);
        if (!Number.isFinite(rate) || rate < 0 || rate > 100) return NextResponse.json({ error: 'Commission must be between 0 and 100 percent.' }, { status: 400 });
        updates.push('commission_percent = ?'); values.push(rate); details.commissionPercent = rate;
      }
      if (body.affiliateStatus !== undefined) {
        if (!['active','paused'].includes(String(body.affiliateStatus))) return NextResponse.json({ error: 'Affiliate status must be active or paused.' }, { status: 400 });
        updates.push('status = ?'); values.push(body.affiliateStatus); details.status = body.affiliateStatus;
      }
      if (body.affiliateType !== undefined) {
        if (!['admin_created','external_website'].includes(String(body.affiliateType))) return NextResponse.json({ error: 'Invalid affiliate type.' }, { status: 400 });
        updates.push('affiliate_type = ?'); values.push(body.affiliateType); details.affiliateType = body.affiliateType;
      }
      if (body.websiteUrl !== undefined) {
        const websiteUrl = String(body.websiteUrl || '').trim();
        if (websiteUrl && !/^https?:\/\//i.test(websiteUrl)) return NextResponse.json({ error: 'Website URL must start with http:// or https://.' }, { status: 400 });
        if (websiteUrl.length > 512) return NextResponse.json({ error: 'Website URL is too long.' }, { status: 400 });
        updates.push('website_url = ?'); values.push(websiteUrl || null); details.websiteUrl = websiteUrl || null;
      }
      const nextType = String(body.affiliateType ?? profiles[0].affiliate_type ?? 'admin_created');
      const rawNextUrl = body.websiteUrl === undefined ? String(profiles[0].website_url || '') : String(body.websiteUrl || '').trim();
      let nextWebsite: string | null = null;
      if (rawNextUrl) { try { const parsed = new URL(rawNextUrl); if (!['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password || !parsed.hostname.includes('.') || ['localhost','127.0.0.1'].includes(parsed.hostname.toLowerCase())) throw new Error('invalid'); nextWebsite = parsed.toString().replace(/\/$/, ''); } catch { return NextResponse.json({ error: 'Enter a valid public website URL starting with https:// or http://.' }, { status: 400 }); } }
      if (!['admin_created','external_website'].includes(nextType)) return NextResponse.json({ error: 'Invalid affiliate type.' }, { status: 400 });
      if (rawNextUrl.length > 512) return NextResponse.json({ error: 'Website URL is too long.' }, { status: 400 });
      if (nextType === 'external_website' && !nextWebsite) return NextResponse.json({ error: 'External website affiliates must have a valid website URL.' }, { status: 400 });
      if (!updates.length) return NextResponse.json({ error: 'No affiliate changes supplied.' }, { status: 400 });
      values.push(userId);
      await getPool().execute(`UPDATE affiliate_profiles SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`, values);
      await logAdminAction(actor.id, 'affiliate.profile_updated', 'affiliate_profile', userId, details, request);
      return NextResponse.json({ success: true, message: 'Affiliate profile updated.' });
    }

    const commissionId = Number(body.commissionId);
    const status = String(body.status || '');
    if (!Number.isSafeInteger(commissionId) || commissionId < 1 || !['approved', 'paid', 'reversed'].includes(status)) return NextResponse.json({ error: 'Choose a valid commission and status.' }, { status: 400 });
    const [rows] = await getPool().execute<Array<RowDataPacket & { status: string; affiliate_user_id: string; commission_paise: number }>>(
      'SELECT status, affiliate_user_id, commission_paise FROM affiliate_commissions WHERE id = ? LIMIT 1', [commissionId],
    );
    if (!rows.length) return NextResponse.json({ error: 'Commission record not found.' }, { status: 404 });
    if (rows[0].status === 'paid' && status !== 'paid') return NextResponse.json({ error: 'A paid commission cannot be changed here.' }, { status: 409 });
    if (status === 'paid' && rows[0].status !== 'approved') return NextResponse.json({ error: 'Approve a commission before marking it paid.' }, { status: 409 });
    if (rows[0].status === 'reversed') return NextResponse.json({ error: 'A reversed commission cannot be changed.' }, { status: 409 });
    await getPool().execute('UPDATE affiliate_commissions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, commissionId]);
    await logAdminAction(actor.id, 'affiliate.commission_status_updated', 'affiliate_commission', commissionId, { status, affiliateUserId: rows[0].affiliate_user_id, commissionPaise: Number(rows[0].commission_paise || 0) }, request);
    return NextResponse.json({ success: true, message: `Commission marked ${status}.` });
  } catch (error) {
    if (connection) { try { await connection.rollback(); } catch { /* ignore rollback failures */ } }
    console.error('Affiliate administration update failed:', error);
    return NextResponse.json({ error: 'Unable to update affiliate data.' }, { status: 500 });
  } finally { connection?.release(); }
}
