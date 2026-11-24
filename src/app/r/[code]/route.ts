import { createHash, createHmac, randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import { NextRequest, NextResponse } from 'next/server';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { getCurrentUser } from '@/lib/session';
import { dispatchAffiliatePostbackDelivery, type AffiliatePostbackMethod } from '@/lib/affiliate-postback';

export const runtime = 'nodejs';

const CLICK_ID_PATTERN = /^[A-Za-z0-9._~-]{1,191}$/;
const VISITOR_COOKIE = 'sportrz_affiliate_visitor';
const VISITOR_TOKEN_PATTERN = /^[a-f0-9]{48}$/i;
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function appOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password) return parsed.origin;
    } catch {
      // Use the request origin in local development when no valid URL is configured.
    }
  }
  return request.nextUrl.origin;
}

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getFraudSalt(): string {
  const configured = process.env.AFFILIATE_FRAUD_SALT || process.env.AUTH_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV !== 'production') return 'sportrz-local-click-fraud-salt-change-before-deploy';
  throw new Error('Set AFFILIATE_FRAUD_SALT or a 32+ character AUTH_SECRET before enabling CPC rewards.');
}

function normalizeIp(raw: string): string | null {
  let value = raw.trim().replace(/^"|"$/g, '');
  if (!value) return null;
  if (value.startsWith('[') && value.includes(']')) value = value.slice(1, value.indexOf(']'));
  if (value.startsWith('::ffff:')) value = value.slice(7);
  // Ignore an IPv4 port. Do not strip colons from IPv6 addresses.
  if (value.includes('.') && /^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(value)) value = value.slice(0, value.lastIndexOf(':'));
  return isIP(value) ? value.toLowerCase() : null;
}

/**
 * Use only trusted reverse-proxy headers. On a direct production deployment,
 * configure CF-Connecting-IP / X-Real-IP or set TRUST_PROXY_IP_HEADERS=true
 * for a platform that sanitizes X-Forwarded-For (e.g. Vercel).
 */
function getClientIp(request: NextRequest): string | null {
  // Never trust client-supplied forwarding headers unless the deployment proxy
  // is configured to overwrite/sanitize them before the request reaches Next.js.
  const candidates = process.env.TRUST_PROXY_IP_HEADERS === 'true'
    ? [
        request.headers.get('cf-connecting-ip'),
        request.headers.get('x-real-ip'),
        request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      ]
    : [];
  for (const candidate of candidates) {
    const normalized = candidate ? normalizeIp(candidate) : null;
    if (normalized) return normalized;
  }
  // Local development usually has no trusted proxy headers. A fixed local
  // marker makes new Incognito windows on the same dev machine deduplicate.
  return process.env.NODE_ENV === 'production' ? null : 'local-development';
}

function createNetworkKey(affiliateUserId: string, request: NextRequest, userAgent: string): string | null {
  const ip = getClientIp(request);
  if (!ip || !userAgent.trim()) return null;
  const salt = getFraudSalt();
  const ipFingerprint = createHmac('sha256', salt).update(`ip:${ip}`).digest('hex');
  const userAgentFingerprint = createHmac('sha256', salt)
    .update(`ua:${userAgent.trim().toLowerCase().slice(0, 512)}`)
    .digest('hex');
  // One rewarded click per affiliate/network/browser signature per UTC day.
  // Raw IP and user-agent values are not written to the database.
  return createHmac('sha256', salt)
    .update(`${affiliateUserId}:${utcDayKey()}:${ipFingerprint}:${userAgentFingerprint}`)
    .digest('hex');
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: VISITOR_COOKIE_MAX_AGE,
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await context.params;
  const referralCode = String(rawCode || '').trim().toUpperCase();
  const origin = appOrigin(request);
  const homeUrl = new URL('/', origin);

  if (!/^[A-Z0-9-]{3,32}$/.test(referralCode)) {
    homeUrl.searchParams.set('referral_error', 'invalid');
    return NextResponse.redirect(homeUrl, 302);
  }

  let visitorToken = request.cookies.get(VISITOR_COOKIE)?.value || '';
  if (!VISITOR_TOKEN_PATTERN.test(visitorToken)) visitorToken = randomBytes(24).toString('hex');
  const visitorHash = createHash('sha256').update(visitorToken).digest('hex');

  try {
    const pool = getPool();
    const [profiles] = await pool.execute<Array<RowDataPacket & {
      user_id: string;
      referral_code: string;
      commission_model: 'plan_purchase' | 'pay_per_click';
      click_reward_paise: number;
      affiliate_type: string;
      postback_url: string | null;
      postback_method: AffiliatePostbackMethod | null;
    }>>(
      `SELECT ap.user_id, ap.referral_code, ap.commission_model, ap.click_reward_paise,
              ap.affiliate_type, ap.postback_url, ap.postback_method
         FROM affiliate_profiles ap
         JOIN users u ON u.id = ap.user_id
        WHERE ap.referral_code = ?
          AND ap.status = 'active'
          AND u.account_role = 'affiliate'
          AND u.status = 'active'
        LIMIT 1`,
      [referralCode],
    );

    const profile = profiles[0];
    if (!profile) {
      homeUrl.searchParams.set('referral_error', 'inactive');
      return NextResponse.redirect(homeUrl, 302);
    }

    const suppliedClickId = request.nextUrl.searchParams.get('click_id')?.trim() || '';
    const isPartnerClick = CLICK_ID_PATTERN.test(suppliedClickId) && !/^\{.*\}$/.test(suppliedClickId);
    const clickId = isPartnerClick ? suppliedClickId : `clk_${randomBytes(18).toString('hex')}`;
    const userAgent = (request.headers.get('user-agent') || '').slice(0, 512);
    const lowerAgent = userAgent.toLowerCase();
    const isAutomatedAgent = /bot|crawler|spider|preview|facebookexternalhit|whatsapp|telegram|slackbot|discordbot|twitterbot|linkedinbot|google-inspectiontool|uptime|monitor|headlesschrome|pagespeed/i.test(lowerAgent);
    const currentUser = await getCurrentUser();
    const isAffiliateSelfClick = currentUser?.uid === profile.user_id;
    const networkKey = createNetworkKey(profile.user_id, request, userAgent);
    const referrer = request.headers.get('referer');
    let referrerHost: string | null = null;
    if (referrer) {
      try { referrerHost = new URL(referrer).hostname.slice(0, 255); } catch { /* Ignore malformed referrer headers. */ }
    }

    const connection: PoolConnection = await pool.getConnection();
    let clickRecordId = 0;
    let isBillable = false;
    let clickPostbackDeliveryId: number | null = null;
    try {
      await connection.beginTransaction();
      const billableKey = createHash('sha256')
        .update(`${profile.user_id}:${visitorHash}:${utcDayKey()}`)
        .digest('hex');

      const [existingClickRows] = await connection.execute<Array<RowDataPacket & { id: number }>>(
        `SELECT id FROM affiliate_clicks
          WHERE affiliate_user_id = ? AND click_id = ? LIMIT 1`,
        [profile.user_id, clickId],
      );

      if (existingClickRows.length) {
        // The same partner click ID must never earn twice, even if replayed.
        clickRecordId = Number(existingClickRows[0].id);
      } else {
        let nonBillableReason: string | null = null;
        if (isAffiliateSelfClick) nonBillableReason = 'affiliate_self_click';
        else if (isAutomatedAgent) nonBillableReason = 'automated_or_preview_agent';
        else if (!networkKey) nonBillableReason = !userAgent.trim() ? 'user_agent_unavailable' : 'client_ip_unavailable';

        if (!nonBillableReason) {
          try {
            const [inserted] = await connection.execute<ResultSetHeader>(
              `INSERT INTO affiliate_clicks
                 (affiliate_user_id, referral_code, click_id, click_source, landing_path,
                  referrer_host, visitor_hash, billable_key, network_key, is_billable, risk_reason, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, UTC_TIMESTAMP())`,
              [
                profile.user_id,
                profile.referral_code,
                clickId,
                isPartnerClick ? 'partner' : 'sportrz',
                request.nextUrl.pathname.slice(0, 512),
                referrerHost,
                visitorHash,
                billableKey,
                networkKey,
              ],
            );
            clickRecordId = Number(inserted.insertId);
            isBillable = true;
          } catch (error) {
            if ((error as { code?: string })?.code !== 'ER_DUP_ENTRY') throw error;
            const [duplicates] = await connection.execute<Array<RowDataPacket & { id: number; network_key: string | null; billable_key: string | null }>>(
              `SELECT id, network_key, billable_key FROM affiliate_clicks
                WHERE affiliate_user_id = ? AND (network_key = ? OR billable_key = ? OR click_id = ?)
                ORDER BY id ASC LIMIT 1`,
              [profile.user_id, networkKey, billableKey, clickId],
            );
            nonBillableReason = duplicates[0]?.network_key === networkKey
              ? 'duplicate_network_same_day'
              : duplicates[0]?.click_id === clickId
                ? 'duplicate_partner_click_id'
                : 'duplicate_browser_same_day';
          }
        }

        if (!isBillable) {
          const [inserted] = await connection.execute<ResultSetHeader>(
            `INSERT INTO affiliate_clicks
               (affiliate_user_id, referral_code, click_id, click_source, landing_path,
                referrer_host, visitor_hash, billable_key, network_key, is_billable, risk_reason, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0, ?, UTC_TIMESTAMP())`,
            [
              profile.user_id,
              profile.referral_code,
              clickId,
              isPartnerClick ? 'partner' : 'sportrz',
              request.nextUrl.pathname.slice(0, 512),
              referrerHost,
              visitorHash,
              nonBillableReason || 'duplicate_click',
            ],
          );
          clickRecordId = Number(inserted.insertId);
        }
      }

      if (isBillable && profile.commission_model === 'pay_per_click' && Number(profile.click_reward_paise) > 0) {
        const [commissionInsert] = await connection.execute<ResultSetHeader>(
          `INSERT IGNORE INTO affiliate_commissions
             (affiliate_user_id, referred_user_id, payment_record_id, click_record_id,
              commission_model, amount_paise, commission_percent, rate_paise,
              commission_paise, status, created_at, updated_at)
           VALUES (?, NULL, NULL, ?, 'pay_per_click', 0, 0, ?, ?, 'pending', UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
          [profile.user_id, clickRecordId, Number(profile.click_reward_paise), Number(profile.click_reward_paise)],
        );

        const clickCommissionId = Number(commissionInsert.insertId || 0);
        const hasExternalPostback = profile.affiliate_type === 'external_website'
          && Boolean(profile.postback_url?.trim());

        if (commissionInsert.affectedRows > 0 && clickCommissionId > 0 && hasExternalPostback) {
          const [deliveryInsert] = await connection.execute<ResultSetHeader>(
            `INSERT IGNORE INTO affiliate_postback_deliveries
               (affiliate_user_id, commission_id, destination_url, http_method, status)
             VALUES (?, ?, ?, ?, 'pending')`,
            [profile.user_id, clickCommissionId, profile.postback_url, profile.postback_method || 'POST'],
          );
          if (deliveryInsert.affectedRows > 0 && deliveryInsert.insertId > 0) {
            clickPostbackDeliveryId = Number(deliveryInsert.insertId);
          }
        }
      }

      await connection.commit();
    } catch (error) {
      try { await connection.rollback(); } catch { /* Preserve the original error. */ }
      throw error;
    } finally {
      connection.release();
    }

    // Dispatch the click reward only after the ledger and outbox row are committed.
    // A partner outage must never block referral attribution or roll back the reward.
    if (clickPostbackDeliveryId) {
      const deliveryResult = await dispatchAffiliatePostbackDelivery(clickPostbackDeliveryId, profile.user_id)
        .catch((error) => {
          console.error('Affiliate click postback dispatch failed:', error);
          return { sent: false, error: error instanceof Error ? error.message : 'Postback dispatch failed.' };
        });
      if (!deliveryResult.sent) {
        console.warn('Affiliate click postback delivery failed:', deliveryResult.error || 'Unknown delivery error');
      }
    }

    const response = NextResponse.redirect(homeUrl, 302);
    const options = cookieOptions();
    response.cookies.set('sportrz_affiliate_code', profile.referral_code, options);
    response.cookies.set('sportrz_affiliate_click', clickId, options);
    response.cookies.set(VISITOR_COOKIE, visitorToken, options);
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error) {
    console.error('Affiliate click tracking failed:', error);
    // Keep the referral usable during a transient analytics failure. A first
    // party click record can still be attached at sign-in, but it is not paid.
    const fallbackClickId = `clk_${randomBytes(18).toString('hex')}`;
    const response = NextResponse.redirect(homeUrl, 302);
    const options = cookieOptions();
    response.cookies.set('sportrz_affiliate_code', referralCode, options);
    response.cookies.set('sportrz_affiliate_click', fallbackClickId, options);
    response.cookies.set(VISITOR_COOKIE, visitorToken, options);
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  }
}
