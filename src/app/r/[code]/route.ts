import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';

export const runtime = 'nodejs';

const CLICK_ID_PATTERN = /^[A-Za-z0-9._~-]{1,191}$/;

function appOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password) {
        return parsed.origin;
      }
    } catch {
      // Fall back to the current request origin in local development.
    }
  }
  return request.nextUrl.origin;
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

  try {
    const [profiles] = await getPool().execute<Array<RowDataPacket & { user_id: string; referral_code: string }>>(
      `SELECT ap.user_id, ap.referral_code
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
    const referrer = request.headers.get('referer');
    let referrerHost: string | null = null;
    if (referrer) {
      try { referrerHost = new URL(referrer).hostname.slice(0, 255); } catch { /* ignore malformed referrer */ }
    }

    // Click data is stored server-side. The browser only receives an opaque ID.
    await getPool().execute(
      `INSERT INTO affiliate_clicks
         (affiliate_user_id, referral_code, click_id, click_source, landing_path, referrer_host, created_at)
       VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
      [
        profile.user_id,
        profile.referral_code,
        clickId,
        isPartnerClick ? 'partner' : 'sportrz',
        request.nextUrl.pathname.slice(0, 512),
        referrerHost,
      ],
    );

    loginUrl.searchParams.set('ref', profile.referral_code);
    loginUrl.searchParams.set('click_id', clickId);

    const requestedNext = request.nextUrl.searchParams.get('next') || '';
    if (requestedNext.startsWith('/') && !requestedNext.startsWith('//')) {
      loginUrl.searchParams.set('next', requestedNext);
    }

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
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error) {
    // Keep registration usable if click analytics storage is temporarily down.
    // OTP registration performs a server-side fallback click insert.
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
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  }
}
