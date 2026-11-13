import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { getAdminPrincipal, hasPermission } from '@/lib/admin-access';
import { logAdminAction } from '@/lib/admin-audit';
import { buildAffiliateReferralUrl } from '@/lib/affiliate-links';
import {
  assertPublicPostbackUrl,
  getAffiliatePostbackSecret,
  normalizePostbackTemplate,
  type AffiliatePostbackMethod,
} from '@/lib/affiliate-postback';

export const runtime = 'nodejs';

const makeReferralCode = () => `SP-${randomBytes(5).toString('hex').toUpperCase()}`;

async function uniqueReferralCode(connection: PoolConnection): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = makeReferralCode();
    const [rows] = await connection.execute<Array<RowDataPacket & { user_id: string }>>(
      'SELECT user_id FROM affiliate_profiles WHERE referral_code = ? LIMIT 1',
      [code],
    );
    if (!rows.length) return code;
  }
  throw new Error('Unable to generate a unique affiliate referral code. Please try again.');
}

function parseMethod(value: unknown, fallback: AffiliatePostbackMethod = 'POST'): AffiliatePostbackMethod | null {
  if (value === undefined || value === null || value === '') return fallback;
  return value === 'POST' || value === 'GET' ? value : null;
}

function normalizeWebsiteUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length > 512) return null;
  try {
    const parsed = new URL(value.trim());
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    if (!parsed.hostname.includes('.') || ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname.toLowerCase())) return null;
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || (!actor.isAffiliate && !hasPermission(actor, 'affiliates.view'))) {
      return NextResponse.json({ error: 'Affiliate access required.' }, { status: 403 });
    }
    const pool = getPool();

    // The affiliate API only queries using the authenticated affiliate ID. No
    // request parameter can be used to read another affiliate's information.
    if (actor.isAffiliate) {
      const [profileRows] = await pool.execute<Array<RowDataPacket & {
        referral_code: string; commission_percent: number; status: string;
        payout_email: string | null; affiliate_type: string; website_url: string | null;
      }>>(
        `SELECT ap.referral_code, ap.commission_percent, ap.status, ap.payout_email,
                ap.affiliate_type, ap.website_url
           FROM affiliate_profiles ap
           JOIN users u ON u.id = ap.user_id
          WHERE ap.user_id = ? AND u.account_role = 'affiliate' AND u.status = 'active'
          LIMIT 1`,
        [actor.id],
      );
      const profile = profileRows[0];
      if (!profile) {
        return NextResponse.json({ affiliate: null, referrals: [], commissions: [], commissionTransactions: [], clickStats: { total: 0, converted: 0 }, scope: 'own-referrals-only' }, { headers: { 'Cache-Control': 'no-store' } });
      }

      const [referrals] = await pool.execute<Array<RowDataPacket & {
        id: string; email: string; display_name: string | null; created_at: Date | string;
        active_subscription: string | null; captured_payments: number; click_id: string | null;
      }>>(
        `SELECT u.id, u.email, u.display_name, ar.created_at, ar.click_id,
          (SELECT pl.code FROM subscriptions s JOIN plans pl ON pl.id = s.plan_id
            WHERE s.user_id = u.id AND s.status = 'active'
              AND (s.end_at IS NULL OR s.end_at > UTC_TIMESTAMP())
            ORDER BY s.end_at DESC LIMIT 1) AS active_subscription,
          (SELECT COUNT(*) FROM payments p
            WHERE p.user_id = u.id AND p.status = 'captured'
              AND COALESCE(p.paid_at, p.created_at) >= ar.created_at) AS captured_payments
         FROM affiliate_referrals ar
         JOIN users u ON u.id = ar.referred_user_id
        WHERE ar.affiliate_user_id = ? AND ar.status = 'qualified'
        ORDER BY ar.created_at DESC
        LIMIT 500`,
        [actor.id],
      );

      const [revenueRows] = await pool.execute<Array<RowDataPacket & { user_id: string; currency: string; amount_paise: number }>>(
        `SELECT ar.referred_user_id AS user_id, p.currency, SUM(p.amount_paise) AS amount_paise
           FROM affiliate_referrals ar
           JOIN payments p ON p.user_id = ar.referred_user_id AND p.status = 'captured'
          WHERE ar.affiliate_user_id = ? AND ar.status = 'qualified'
            AND COALESCE(p.paid_at, p.created_at) >= ar.created_at
          GROUP BY ar.referred_user_id, p.currency`,
        [actor.id],
      );
      const revenueMap = new Map<string, Array<{ currency: string; amount: number }>>();
      for (const row of revenueRows) {
        const values = revenueMap.get(row.user_id) || [];
        values.push({ currency: row.currency || 'INR', amount: Number(row.amount_paise || 0) / 100 });
        revenueMap.set(row.user_id, values);
      }

      const [commissionRows] = await pool.execute<Array<RowDataPacket & {
        status: string; currency: string; total_paise: number; count: number;
      }>>(
        `SELECT ac.status, p.currency, SUM(ac.commission_paise) AS total_paise, COUNT(*) AS count
           FROM affiliate_commissions ac
           JOIN payments p ON p.id = ac.payment_record_id
          WHERE ac.affiliate_user_id = ?
          GROUP BY ac.status, p.currency
          ORDER BY ac.status, p.currency`,
        [actor.id],
      );

      const [commissionTransactions] = await pool.execute<Array<RowDataPacket & {
        id: number; referred_email: string; referred_name: string | null; plan_name: string;
        plan_code: string; click_id: string | null; order_id: string; provider_payment_id: string | null;
        amount_paise: number; commission_percent: number; commission_paise: number; currency: string;
        status: string; paid_at: Date | string | null; created_at: Date | string;
        postback_status: string | null; postback_http_status: number | null; postback_attempts: number | null;
      }>>(
        `SELECT ac.id, ru.email AS referred_email, ru.display_name AS referred_name,
                pl.name AS plan_name, pl.code AS plan_code, ar.click_id,
                p.order_id, p.provider_payment_id, ac.amount_paise, ac.commission_percent,
                ac.commission_paise, p.currency, ac.status, p.paid_at, ac.created_at,
                d.status AS postback_status, d.http_status AS postback_http_status,
                d.attempt_count AS postback_attempts
           FROM affiliate_commissions ac
           JOIN payments p ON p.id = ac.payment_record_id
           JOIN plans pl ON pl.id = p.plan_id
           JOIN users ru ON ru.id = ac.referred_user_id
           LEFT JOIN affiliate_referrals ar
             ON ar.referred_user_id = ac.referred_user_id AND ar.affiliate_user_id = ac.affiliate_user_id
           LEFT JOIN affiliate_postback_deliveries d ON d.commission_id = ac.id
          WHERE ac.affiliate_user_id = ?
          ORDER BY COALESCE(p.paid_at, ac.created_at) DESC, ac.id DESC
          LIMIT 500`,
        [actor.id],
      );

      const [[clickStats]] = await pool.execute<Array<RowDataPacket & { total: number; converted: number }>>(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN referred_user_id IS NOT NULL THEN 1 ELSE 0 END) AS converted
           FROM affiliate_clicks WHERE affiliate_user_id = ?`,
        [actor.id],
      );

      return NextResponse.json({
        affiliate: {
          ...profile,
          commission_percent: Number(profile.commission_percent),
          referral_url: buildAffiliateReferralUrl(profile.referral_code),
        },
        referrals: referrals.map((row) => ({
          id: row.id, email: row.email, displayName: row.display_name || '', referredAt: row.created_at,
          clickId: row.click_id || '', activeSubscription: row.active_subscription,
          capturedPayments: Number(row.captured_payments || 0), revenueByCurrency: revenueMap.get(row.id) || [],
        })),
        commissions: commissionRows.map((row) => ({
          status: row.status, currency: row.currency || 'INR',
          amount: Number(row.total_paise || 0) / 100, count: Number(row.count || 0),
        })),
        commissionTransactions: commissionTransactions.map((row) => ({
          id: Number(row.id), referredEmail: row.referred_email, referredName: row.referred_name || '',
          clickId: row.click_id || '', planName: row.plan_name, planCode: row.plan_code,
          orderId: row.order_id, paymentId: row.provider_payment_id || '',
          amount: Number(row.amount_paise || 0) / 100, currency: row.currency || 'INR',
          commissionPercent: Number(row.commission_percent || 0), commission: Number(row.commission_paise || 0) / 100,
          status: row.status, paidAt: row.paid_at, createdAt: row.created_at,
          postbackStatus: row.postback_status || 'not_configured',
          postbackHttpStatus: row.postback_http_status == null ? null : Number(row.postback_http_status),
          postbackAttempts: Number(row.postback_attempts || 0),
        })),
        clickStats: { total: Number(clickStats?.total || 0), converted: Number(clickStats?.converted || 0) },
        scope: 'own-referrals-only',
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const [rows] = await pool.query<Array<RowDataPacket & {
      user_id: string; email: string; display_name: string | null; referral_code: string;
      commission_percent: number; affiliate_status: string; affiliate_type: string; website_url: string | null;
      postback_url: string | null; postback_method: AffiliatePostbackMethod | null;
      created_at: Date | string; referral_count: number; converted_count: number; click_count: number;
    }>>(
      `SELECT u.id AS user_id, u.email, u.display_name, ap.referral_code, ap.commission_percent,
              ap.status AS affiliate_status, ap.affiliate_type, ap.website_url,
              ap.postback_url, ap.postback_method, ap.created_at,
              (SELECT COUNT(*) FROM affiliate_referrals ar WHERE ar.affiliate_user_id = ap.user_id AND ar.status = 'qualified') AS referral_count,
              (SELECT COUNT(DISTINCT ar.referred_user_id) FROM affiliate_referrals ar
                JOIN payments p ON p.user_id = ar.referred_user_id AND p.status = 'captured'
                WHERE ar.affiliate_user_id = ap.user_id AND ar.status = 'qualified'
                  AND COALESCE(p.paid_at, p.created_at) >= ar.created_at) AS converted_count,
              (SELECT COUNT(*) FROM affiliate_clicks c WHERE c.affiliate_user_id = ap.user_id) AS click_count
         FROM affiliate_profiles ap
         JOIN users u ON u.id = ap.user_id
        WHERE u.account_role = 'affiliate'
        ORDER BY ap.created_at DESC`,
    );

    const [totals] = await pool.query<Array<RowDataPacket & {
      affiliate_user_id: string; currency: string; total_paise: number; pending_paise: number;
    }>>(
      `SELECT ac.affiliate_user_id, p.currency,
              SUM(CASE WHEN ac.status <> 'reversed' THEN ac.commission_paise ELSE 0 END) AS total_paise,
              SUM(CASE WHEN ac.status IN ('pending','approved') THEN ac.commission_paise ELSE 0 END) AS pending_paise
         FROM affiliate_commissions ac
         JOIN payments p ON p.id = ac.payment_record_id
        GROUP BY ac.affiliate_user_id, p.currency`,
    );
    const totalsMap = new Map<string, Array<{ currency: string; total: number; pending: number }>>();
    for (const row of totals) {
      const values = totalsMap.get(row.affiliate_user_id) || [];
      values.push({ currency: row.currency || 'INR', total: Number(row.total_paise || 0) / 100, pending: Number(row.pending_paise || 0) / 100 });
      totalsMap.set(row.affiliate_user_id, values);
    }

    const [ledgerRows] = await pool.query<Array<RowDataPacket & {
      id: number; affiliate_email: string; affiliate_name: string | null; referred_email: string;
      amount_paise: number; commission_percent: number; commission_paise: number; currency: string;
      status: string; payment_record_id: number; order_id: string; provider_payment_id: string | null;
      plan_name: string; paid_at: Date | string | null; created_at: Date | string;
      click_id: string | null; postback_delivery_id: number | null; postback_status: string | null;
      postback_http_status: number | null; postback_attempts: number | null; postback_error: string | null;
    }>>(
      `SELECT ac.id, au.email AS affiliate_email, au.display_name AS affiliate_name,
              ru.email AS referred_email, ac.amount_paise, ac.commission_percent,
              ac.commission_paise, p.currency, ac.status, ac.payment_record_id,
              p.order_id, p.provider_payment_id, pl.name AS plan_name, p.paid_at, ac.created_at,
              ar.click_id, d.id AS postback_delivery_id, d.status AS postback_status,
              d.http_status AS postback_http_status, d.attempt_count AS postback_attempts,
              d.last_error AS postback_error
         FROM affiliate_commissions ac
         JOIN payments p ON p.id = ac.payment_record_id
         JOIN plans pl ON pl.id = p.plan_id
         JOIN users au ON au.id = ac.affiliate_user_id
         JOIN users ru ON ru.id = ac.referred_user_id
         LEFT JOIN affiliate_referrals ar
           ON ar.referred_user_id = ac.referred_user_id AND ar.affiliate_user_id = ac.affiliate_user_id
         LEFT JOIN affiliate_postback_deliveries d ON d.commission_id = ac.id
        ORDER BY ac.created_at DESC LIMIT 500`,
    );

    const [applications] = await pool.query<Array<RowDataPacket & {
      id: number; user_id: string; email: string; display_name: string | null;
      website_url: string; status: string; review_note: string | null; created_at: Date | string;
    }>>(
      `SELECT aa.id, aa.user_id, u.email, u.display_name, aa.website_url, aa.status, aa.review_note, aa.created_at
         FROM affiliate_applications aa
         JOIN users u ON u.id = aa.user_id
        WHERE aa.status = 'pending' AND u.account_role = 'user' AND u.status = 'active'
        ORDER BY aa.created_at ASC LIMIT 200`,
    );

    const canManageAffiliateSettings = actor.isSuperAdmin || hasPermission(actor, 'affiliates.manage');
    const affiliates = rows.map((row) => {
      let postbackSecret: string | null = null;
      if (canManageAffiliateSettings) {
        try { postbackSecret = getAffiliatePostbackSecret(row.user_id); } catch { /* AUTH_SECRET must be set before production dispatch. */ }
      }
      return {
        userId: row.user_id, email: row.email, displayName: row.display_name || '', referralCode: row.referral_code,
        affiliateType: row.affiliate_type || 'admin_created', websiteUrl: row.website_url || '',
        // Only users who can manage affiliates receive the destination URL.
        // Read-only sub-admins still see whether S2S is configured.
        postbackUrl: canManageAffiliateSettings ? row.postback_url || '' : '',
        postbackMethod: row.postback_method || 'POST',
        postbackConfigured: Boolean(row.postback_url), postbackSecret,
        commissionPercent: Number(row.commission_percent), status: row.affiliate_status, createdAt: row.created_at,
        clickCount: Number(row.click_count || 0), referralCount: Number(row.referral_count || 0),
        convertedCount: Number(row.converted_count || 0), commissionByCurrency: totalsMap.get(row.user_id) || [],
        referralUrl: buildAffiliateReferralUrl(row.referral_code),
      };
    });

    return NextResponse.json({
      affiliates,
      commissionLedger: ledgerRows.map((row) => ({
        id: Number(row.id), affiliateEmail: row.affiliate_email, affiliateName: row.affiliate_name || '',
        referredEmail: row.referred_email, amount: Number(row.amount_paise || 0) / 100,
        currency: row.currency || 'INR', commissionPercent: Number(row.commission_percent || 0),
        commission: Number(row.commission_paise || 0) / 100, status: row.status,
        paymentRecordId: Number(row.payment_record_id), orderId: row.order_id,
        paymentId: row.provider_payment_id || '', planName: row.plan_name,
        paidAt: row.paid_at, createdAt: row.created_at, clickId: row.click_id || '',
        postbackDeliveryId: row.postback_delivery_id == null ? null : Number(row.postback_delivery_id),
        postbackStatus: row.postback_status || 'not_configured',
        postbackHttpStatus: row.postback_http_status == null ? null : Number(row.postback_http_status),
        postbackAttempts: Number(row.postback_attempts || 0), postbackError: row.postback_error || '',
      })),
      applications: applications.map((row) => ({
        id: Number(row.id), userId: row.user_id, email: row.email, displayName: row.display_name || '',
        websiteUrl: row.website_url, status: row.status, reviewNote: row.review_note, createdAt: row.created_at,
      })),
      scope: 'all-affiliates',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Affiliates API failed:', error);
    return NextResponse.json({ error: 'Unable to load affiliate information. Run npm run db:migrate:admin and check the database connection.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  let connection: PoolConnection | null = null;
  try {
    const actor = await getAdminPrincipal();
    if (!actor || actor.isAffiliate || (!actor.isSuperAdmin && !hasPermission(actor, 'affiliates.manage'))) {
      return NextResponse.json({ error: 'Affiliate management access required.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be a valid JSON object.' }, { status: 400 });
    }

    if (body.applicationId !== undefined) {
      const applicationId = Number(body.applicationId);
      const applicationAction = String(body.applicationAction || '');
      if (!Number.isSafeInteger(applicationId) || applicationId < 1 || !['approve', 'reject'].includes(applicationAction)) {
        return NextResponse.json({ error: 'Choose a valid affiliate application action.' }, { status: 400 });
      }
      const commissionPercent = body.commissionPercent === undefined ? 10 : Number(body.commissionPercent);
      if (applicationAction === 'approve' && (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100)) {
        return NextResponse.json({ error: 'Commission must be between 0 and 100 percent.' }, { status: 400 });
      }

      connection = await getPool().getConnection();
      await connection.beginTransaction();
      const [appRows] = await connection.execute<Array<RowDataPacket & {
        id: number; user_id: string; email: string; website_url: string; status: string;
        account_role: string; user_status: string;
      }>>(
        `SELECT aa.id, aa.user_id, u.email, aa.website_url, aa.status,
                u.account_role, u.status AS user_status
           FROM affiliate_applications aa
           JOIN users u ON u.id = aa.user_id
          WHERE aa.id = ? LIMIT 1 FOR UPDATE`,
        [applicationId],
      );
      const application = appRows[0];
      if (!application) {
        await connection.rollback();
        return NextResponse.json({ error: 'Affiliate application not found.' }, { status: 404 });
      }
      if (application.status !== 'pending') {
        await connection.rollback();
        return NextResponse.json({ error: 'This application has already been reviewed.' }, { status: 409 });
      }

      if (applicationAction === 'reject') {
        const reviewNote = String(body.reviewNote || '').trim().slice(0, 512) || null;
        await connection.execute(
          `UPDATE affiliate_applications SET status = 'rejected', review_note = ?, reviewed_by_admin_id = ?,
                  reviewed_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = ?`,
          [reviewNote, actor.id, applicationId],
        );
        await connection.commit();
        await logAdminAction(actor.id, 'affiliate.application_rejected', 'affiliate_application', applicationId, { userId: application.user_id, websiteUrl: application.website_url, reviewNote }, request);
        return NextResponse.json({ success: true, message: 'Affiliate application rejected.' });
      }

      if (application.user_status !== 'active' || application.account_role !== 'user') {
        await connection.rollback();
        return NextResponse.json({ error: 'Only an active regular-user account can be approved.' }, { status: 409 });
      }
      const code = await uniqueReferralCode(connection);
      await connection.execute("UPDATE users SET account_role = 'affiliate', is_admin = 1, updated_at = UTC_TIMESTAMP() WHERE id = ?", [application.user_id]);
      await connection.execute('DELETE FROM admin_user_permissions WHERE user_id = ?', [application.user_id]);
      await connection.execute(
        `INSERT INTO affiliate_profiles
           (user_id, referral_code, commission_percent, payout_email, status, affiliate_type, website_url, postback_method)
         VALUES (?, ?, ?, ?, 'active', 'external_website', ?, 'POST')`,
        [application.user_id, code, commissionPercent, application.email, application.website_url],
      );
      await connection.execute(
        `UPDATE affiliate_applications SET status = 'approved', review_note = NULL,
                reviewed_by_admin_id = ?, reviewed_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP()
          WHERE id = ?`,
        [actor.id, applicationId],
      );
      await connection.commit();
      await logAdminAction(actor.id, 'affiliate.application_approved', 'affiliate_application', applicationId, {
        userId: application.user_id, websiteUrl: application.website_url, commissionPercent, referralCode: code,
      }, request);
      return NextResponse.json({ success: true, message: 'Affiliate approved. A first-party tracking link is ready in their dashboard.' });
    }

    if (body.userId !== undefined) {
      const userId = String(body.userId || '').trim();
      if (!userId || userId.length > 36) return NextResponse.json({ error: 'Select a valid affiliate.' }, { status: 400 });

      const pool = getPool();
      const [profiles] = await pool.execute<Array<RowDataPacket & {
        commission_percent: number; status: string; affiliate_type: string; website_url: string | null;
        postback_url: string | null; postback_method: AffiliatePostbackMethod | null;
      }>>(
        `SELECT ap.commission_percent, ap.status, ap.affiliate_type, ap.website_url,
                ap.postback_url, ap.postback_method
           FROM affiliate_profiles ap
           JOIN users u ON u.id = ap.user_id
          WHERE ap.user_id = ? AND u.account_role = 'affiliate'
          LIMIT 1`,
        [userId],
      );
      const profile = profiles[0];
      if (!profile) return NextResponse.json({ error: 'Affiliate profile not found.' }, { status: 404 });

      const commissionPercent = body.commissionPercent === undefined ? Number(profile.commission_percent) : Number(body.commissionPercent);
      if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
        return NextResponse.json({ error: 'Commission must be between 0 and 100 percent.' }, { status: 400 });
      }
      const affiliateStatus = body.affiliateStatus === undefined ? profile.status : String(body.affiliateStatus);
      if (!['active', 'paused'].includes(affiliateStatus)) return NextResponse.json({ error: 'Affiliate status must be active or paused.' }, { status: 400 });
      const affiliateType = body.affiliateType === undefined ? profile.affiliate_type : String(body.affiliateType);
      if (!['admin_created', 'external_website'].includes(affiliateType)) return NextResponse.json({ error: 'Invalid affiliate type.' }, { status: 400 });

      const rawWebsite = body.websiteUrl === undefined ? String(profile.website_url || '') : String(body.websiteUrl || '').trim();
      const websiteUrl = rawWebsite ? normalizeWebsiteUrl(rawWebsite) : null;
      if (rawWebsite && !websiteUrl) return NextResponse.json({ error: 'Enter a valid public website URL starting with https:// or http://.' }, { status: 400 });
      if (affiliateType === 'external_website' && !websiteUrl) return NextResponse.json({ error: 'External website affiliates must have a valid website URL.' }, { status: 400 });

      const rawPostbackUrl = affiliateType === 'external_website'
        ? (body.postbackUrl === undefined ? String(profile.postback_url || '') : String(body.postbackUrl || '').trim())
        : ''; // Clear the external destination when an admin changes this to an internal affiliate.
      const postbackUrl = normalizePostbackTemplate(rawPostbackUrl);
      if (postbackUrl === null) return NextResponse.json({ error: 'Enter a valid public HTTPS postback URL. Supported macros include {click_id}, {order_id}, {payment_id}, {amount}, {currency}, and {commission}.' }, { status: 400 });
      if (postbackUrl) {
        await assertPublicPostbackUrl(postbackUrl);
        // Fail early in production rather than saving a destination that cannot
        // be signed because the required master secret is missing.
        getAffiliatePostbackSecret(userId);
      }

      const postbackMethod = parseMethod(body.postbackMethod, profile.postback_method || 'POST');
      if (!postbackMethod) return NextResponse.json({ error: 'Postback method must be POST or GET.' }, { status: 400 });

      connection = await pool.getConnection();
      await connection.beginTransaction();
      await connection.execute(
        `UPDATE affiliate_profiles
            SET commission_percent = ?, status = ?, affiliate_type = ?, website_url = ?,
                postback_url = ?, postback_method = ?, updated_at = UTC_TIMESTAMP()
          WHERE user_id = ?`,
        [commissionPercent, affiliateStatus, affiliateType, websiteUrl, postbackUrl || null, postbackMethod, userId],
      );

      if (postbackUrl && affiliateStatus === 'active' && affiliateType === 'external_website') {
        // Queue historical commissions that did not have an endpoint when first paid.
        // The unique commission key ensures this cannot create duplicate deliveries.
        await connection.execute(
          `INSERT IGNORE INTO affiliate_postback_deliveries
             (affiliate_user_id, commission_id, destination_url, http_method, status)
           SELECT ac.affiliate_user_id, ac.id, ?, ?, 'pending'
             FROM affiliate_commissions ac
            WHERE ac.affiliate_user_id = ? AND ac.status <> 'reversed'`,
          [postbackUrl, postbackMethod, userId],
        );
        await connection.execute(
          `UPDATE affiliate_postback_deliveries
              SET destination_url = ?, http_method = ?, status = 'pending',
                  http_status = NULL, last_error = NULL, updated_at = UTC_TIMESTAMP()
            WHERE affiliate_user_id = ? AND status IN ('pending', 'failed')`,
          [postbackUrl, postbackMethod, userId],
        );
      } else {
        await connection.execute(
          `UPDATE affiliate_postback_deliveries
              SET status = 'failed', last_error = 'Postback delivery disabled by admin.',
                  updated_at = UTC_TIMESTAMP()
            WHERE affiliate_user_id = ? AND status IN ('pending', 'failed')`,
          [userId],
        );
      }
      await connection.commit();

      await logAdminAction(actor.id, 'affiliate.profile_updated', 'affiliate_profile', userId, {
        commissionPercent, status: affiliateStatus, affiliateType, websiteUrl,
        postbackConfigured: Boolean(postbackUrl), postbackMethod,
      }, request);
      return NextResponse.json({ success: true, message: 'Affiliate profile and S2S settings updated.' });
    }

    const commissionId = Number(body.commissionId);
    const status = String(body.status || '');
    if (!Number.isSafeInteger(commissionId) || commissionId < 1 || !['approved', 'paid', 'reversed'].includes(status)) {
      return NextResponse.json({ error: 'Choose a valid commission and status.' }, { status: 400 });
    }
    const [rows] = await getPool().execute<Array<RowDataPacket & {
      status: string; affiliate_user_id: string; commission_paise: number;
    }>>(
      'SELECT status, affiliate_user_id, commission_paise FROM affiliate_commissions WHERE id = ? LIMIT 1',
      [commissionId],
    );
    if (!rows.length) return NextResponse.json({ error: 'Commission record not found.' }, { status: 404 });
    if (rows[0].status === 'paid' && status !== 'paid') return NextResponse.json({ error: 'A paid commission cannot be changed here.' }, { status: 409 });
    if (status === 'paid' && rows[0].status !== 'approved') return NextResponse.json({ error: 'Approve a commission before marking it paid.' }, { status: 409 });
    if (rows[0].status === 'reversed') return NextResponse.json({ error: 'A reversed commission cannot be changed.' }, { status: 409 });

    await getPool().execute('UPDATE affiliate_commissions SET status = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [status, commissionId]);
    await logAdminAction(actor.id, 'affiliate.commission_status_updated', 'affiliate_commission', commissionId, {
      status, affiliateUserId: rows[0].affiliate_user_id, commissionPaise: Number(rows[0].commission_paise || 0),
    }, request);
    return NextResponse.json({ success: true, message: `Commission marked ${status}.` });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch { /* Keep the original error. */ }
    }
    const message = error instanceof Error ? error.message : 'Unable to update affiliate data.';
    console.error('Affiliate administration update failed:', error);
    if (message.toLowerCase().includes('postback') || message.toLowerCase().includes('hostname') || message.toLowerCase().includes('https')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to update affiliate data. Check the server log for details.' }, { status: 500 });
  } finally {
    connection?.release();
  }
}
