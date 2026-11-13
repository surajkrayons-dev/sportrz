import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';

export const runtime = 'nodejs';

const CLICK_ID_PATTERN = /^[A-Za-z0-9._~-]{1,191}$/;
const VISITOR_COOKIE = 'sportrz_affiliate_visitor';
const VISITOR_TOKEN_PATTERN = /^[a-f0-9]{48}$/i;

function appOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password) return parsed.origin;
    } catch {
      // Fall back to the current request origin during local development.
    }
  }
  return request.nextUrl.origin;
}

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await context.params;
  const referralCode = String(rawCode || '').trim().toUpperCase();
  const origin = appOrigin(request);
  const loginUrl = new URL('/login', origin);

  if (!/^[A-Z0-9-]{3,32}$/.test(referralCode)) {
    loginUrl.searchParams.set('referral_error', 'invalid');
    return NextResponse.redirect(loginUrl, 302);
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
    }>>(
      `SELECT ap.user_id, ap.referral_code, ap.commission_model, ap.click_reward_paise
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
      loginUrl.searchParams.set('referral_error', 'inactive');
      return NextResponse.redirect(loginUrl, 302);
    }

    const suppliedClickId = request.nextUrl.searchParams.get('click_id')?.trim() || '';
    const isPartnerClick = CLICK_ID_PATTERN.test(suppliedClickId) && !/^\{.*\}$/.test(suppliedClickId);
    const clickId = isPartnerClick ? suppliedClickId : `clk_${randomBytes(18).toString('hex')}`;
    const userAgent = request.headers.get('user-agent') || '';
    // Known crawlers, link-preview agents and uptime monitors must never be billable.
    const isAutomatedAgent = /bot|crawler|spider|preview|facebookexternalhit|whatsapp|telegram|slackbot|discordbot|twitterbot|linkedinbot|google-inspectiontool|uptime|monitor/i.test(userAgent);
    const referrer = request.headers.get('referer');
    let referrerHost: string | null = null;
    if (referrer) {
      try { referrerHost = new URL(referrer).hostname.slice(0, 255); } catch { /* Ignore malformed referrer headers. */ }
    }

    const connection = await pool.getConnection();
    let clickRecordId = 0;
    let isBillable = false;
    try {
      await connection.beginTransaction();
      const billableKey = createHash('sha256')
        .update(`${profile.user_id}:${visitorHash}:${utcDayKey()}`)
        .digest('hex');
      const clickValues = [
        profile.user_id,
        profile.referral_code,
        clickId,
        isPartnerClick ? 'partner' : 'sportrz',
        request.nextUrl.pathname.slice(0, 512),
        referrerHost,
        visitorHash,
      ];

      // A partner may resend the same click_id on a page refresh. Reuse that
      // event instead of violating the unique (affiliate_user_id, click_id) key.
      const [existingClickRows] = await connection.execute<Array<RowDataPacket & { id: number; is_billable: number }>>(
        `SELECT id, is_billable FROM affiliate_clicks
          WHERE affiliate_user_id = ? AND click_id = ? LIMIT 1`,
        [profile.user_id, clickId],
      );

      if (existingClickRows.length) {
        clickRecordId = Number(existingClickRows[0].id);
        isBillable = false;
      } else if (isAutomatedAgent) {
        const [inserted] = await connection.execute<ResultSetHeader>(
          `INSERT INTO affiliate_clicks
             (affiliate_user_id, referral_code, click_id, click_source, landing_path,
              referrer_host, visitor_hash, billable_key, is_billable, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0, UTC_TIMESTAMP())`,
          clickValues,
        );
        clickRecordId = Number(inserted.insertId);
      } else {
        try {
          const [inserted] = await connection.execute<ResultSetHeader>(
            `INSERT INTO affiliate_clicks
               (affiliate_user_id, referral_code, click_id, click_source, landing_path,
                referrer_host, visitor_hash, billable_key, is_billable, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, UTC_TIMESTAMP())`,
            [...clickValues, billableKey],
          );
          clickRecordId = Number(inserted.insertId);
          isBillable = true;
        } catch (error) {
          // One billable click per browser visitor / affiliate / UTC day.
          // Repeats still count as visits but do not create a second payout.
          if ((error as { code?: string })?.code !== 'ER_DUP_ENTRY') throw error;
          const [duplicateClickRows] = await connection.execute<Array<RowDataPacket & { id: number }>>(
            `SELECT id FROM affiliate_clicks WHERE affiliate_user_id = ? AND click_id = ? LIMIT 1`,
            [profile.user_id, clickId],
          );
          if (duplicateClickRows.length) {
            clickRecordId = Number(duplicateClickRows[0].id);
          } else {
            const [inserted] = await connection.execute<ResultSetHeader>(
              `INSERT INTO affiliate_clicks
                 (affiliate_user_id, referral_code, click_id, click_source, landing_path,
                  referrer_host, visitor_hash, billable_key, is_billable, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0, UTC_TIMESTAMP())`,
              clickValues,
            );
            clickRecordId = Number(inserted.insertId);
          }
        }
      }

      if (isBillable && profile.commission_model === 'pay_per_click' && Number(profile.click_reward_paise) > 0) {
        await connection.execute(
          `INSERT IGNORE INTO affiliate_commissions
             (affiliate_user_id, referred_user_id, payment_record_id, click_record_id,
              commission_model, amount_paise, commission_percent, rate_paise,
              commission_paise, status, created_at, updated_at)
           VALUES (?, NULL, NULL, ?, 'pay_per_click', 0, 0, ?, ?, 'pending', UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
          [profile.user_id, clickRecordId, Number(profile.click_reward_paise), Number(profile.click_reward_paise)],
        );
      }

      await connection.commit();
    } catch (error) {
      try { await connection.rollback(); } catch { /* Preserve the original error. */ }
      throw error;
    } finally {
      connection.release();
    }

    loginUrl.searchParams.set('ref', profile.referral_code);
    loginUrl.searchParams.set('click_id', clickId);

    const requestedNext = request.nextUrl.searchParams.get('next') || '';
    if (requestedNext.startsWith('/') && !requestedNext.startsWith('//')) loginUrl.searchParams.set('next', requestedNext);

    const response = NextResponse.redirect(loginUrl, 302);
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    };
    response.cookies.set('sportrz_affiliate_code', profile.referral_code, cookieOptions);
    response.cookies.set('sportrz_affiliate_click', clickId, cookieOptions);
    response.cookies.set(VISITOR_COOKIE, visitorToken, cookieOptions);
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error) {
    console.error('Affiliate click tracking failed:', error);
    const fallbackClickId = `clk_${randomBytes(18).toString('hex')}`;
    loginUrl.searchParams.set('ref', referralCode);
    loginUrl.searchParams.set('click_id', fallbackClickId);
    const response = NextResponse.redirect(loginUrl, 302);
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    };
    response.cookies.set('sportrz_affiliate_code', referralCode, cookieOptions);
    response.cookies.set('sportrz_affiliate_click', fallbackClickId, cookieOptions);
    response.cookies.set(VISITOR_COOKIE, visitorToken, cookieOptions);
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  }
}
