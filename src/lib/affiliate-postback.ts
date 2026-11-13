import { createHmac } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import https from 'node:https';
import { checkServerIdentity as tlsCheckServerIdentity } from 'node:tls';
import { isIP } from 'node:net';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';

export type AffiliatePostbackMethod = 'POST' | 'GET';
export type AffiliatePostbackPayload = Record<string, string | number>;

const ALLOWED_MACROS = new Set([
  'affiliate_code', 'click_id', 'order_id', 'payment_id', 'amount', 'currency',
  'commission', 'commission_percent', 'commission_id', 'status',
]);
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 4_000;

function isPublicIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = parts;
  // Reject unspecified, private, loopback, link-local, carrier-grade NAT,
  // documentation, benchmarking, multicast and reserved IPv4 ranges.
  return !(
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  );
}

function isPublicIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice('::ffff:'.length);
    return isIP(mapped) === 4 && isPublicIpv4(mapped);
  }
  if (normalized === '::' || normalized === '::1' || normalized.startsWith('fc') ||
      normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') ||
      normalized.startsWith('fea') || normalized.startsWith('feb') || normalized.startsWith('ff') ||
      normalized.startsWith('2001:db8:')) return false;
  // Global unicast IPv6 currently resides in 2000::/3.
  const firstSegment = Number.parseInt(normalized.split(':')[0] || '0', 16);
  return Number.isFinite(firstSegment) && (firstSegment & 0xe000) === 0x2000;
}

function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  return version === 4 ? isPublicIpv4(address) : version === 6 ? isPublicIpv6(address) : false;
}

function toStringValues(payload: AffiliatePostbackPayload): Record<string, string> {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, String(value ?? '')]));
}

function replaceMacros(template: string, values: Record<string, string>): string {
  return template.replace(/\{([a-z_]+)\}/gi, (match, key: string) => {
    const value = values[key.toLowerCase()];
    return value === undefined ? match : encodeURIComponent(value);
  });
}

export function normalizePostbackTemplate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const template = value.trim();
  if (!template) return '';
  if (template.length > 1000) return null;

  const macros = [...template.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1].toLowerCase());
  if (macros.some((macro) => !ALLOWED_MACROS.has(macro))) return null;
  if (/[{}]/.test(template.replace(/\{[a-z_]+\}/gi, ''))) return null;

  try {
    const sampleValues = Object.fromEntries([...ALLOWED_MACROS].map((macro) => [macro, 'sample-value'])) as Record<string, string>;
    const parsed = new URL(replaceMacros(template, sampleValues));
    const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) return null;
    if (parsed.port && parsed.port !== '443') return null;
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) return null;
    if (parsed.toString().length > 2048) return null;
    return template;
  } catch {
    return null;
  }
}

async function resolvePublicPostbackAddress(value: string): Promise<{ address: string; family: 4 | 6 }> {
  const parsed = new URL(value);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (parsed.protocol !== 'https:' || (parsed.port && parsed.port !== '443')) {
    throw new Error('The postback endpoint must use HTTPS on the standard port.');
  }

  const ipVersion = isIP(hostname);
  if (ipVersion) {
    if (!isPublicAddress(hostname)) throw new Error('The postback host must be a public internet address.');
    return { address: hostname, family: ipVersion as 4 | 6 };
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error('The postback hostname could not be resolved. Check the URL and DNS records.');
  }
  if (!addresses.length || addresses.some((item) => !isPublicAddress(item.address))) {
    throw new Error('The postback host must resolve only to public internet addresses.');
  }
  // Prefer IPv4 where available; it is more consistently routable on shared
  // hosting and local developer networks. IPv6 remains a valid fallback.
  const selected = addresses.find((item) => item.family === 4) || addresses[0];
  return { address: selected.address, family: selected.family as 4 | 6 };
}

export async function assertPublicPostbackUrl(value: string): Promise<void> {
  const normalized = normalizePostbackTemplate(value);
  if (!normalized) throw new Error('Enter a valid public HTTPS postback URL. Only supported macros are allowed.');
  const sampleValues = Object.fromEntries([...ALLOWED_MACROS].map((macro) => [macro, 'sample-value'])) as Record<string, string>;
  await resolvePublicPostbackAddress(replaceMacros(normalized, sampleValues));
}

function sendPinnedPostback(
  target: URL,
  pinnedAddress: { address: string; family: 4 | 6 },
  method: AffiliatePostbackMethod,
  payload: AffiliatePostbackPayload,
  headers: Record<string, string>,
): Promise<{ status: number; responseExcerpt: string }> {
  return new Promise((resolve, reject) => {
    const body = method === 'POST' ? Buffer.from(JSON.stringify(payload), 'utf8') : null;
    const requestHeaders: Record<string, string> = {
      Accept: 'application/json, text/plain, */*',
      Host: target.host,
      'User-Agent': 'Sportrz-Affiliate-Postback/1.0',
      ...headers,
    };
    if (body) {
      requestHeaders['Content-Type'] = 'application/json; charset=utf-8';
      requestHeaders['Content-Length'] = String(body.byteLength);
    }

    // Connect to the exact public IP that was checked during DNS validation.
    // Keep the original host for TLS SNI/certificate verification and the Host header.
    // This avoids a second DNS lookup and prevents DNS-rebinding SSRF attacks.
    const hostnameIsIp = isIP(target.hostname) !== 0;
    const request = https.request({
      protocol: 'https:',
      hostname: pinnedAddress.address,
      family: pinnedAddress.family,
      port: Number(target.port || 443),
      path: `${target.pathname}${target.search}`,
      method,
      headers: requestHeaders,
      servername: hostnameIsIp ? undefined : target.hostname,
      // Always validate the certificate against the configured host name, not
      // the pinned IP used for the TCP connection.
      checkServerIdentity: (_hostname, certificate) => tlsCheckServerIdentity(target.hostname.replace(/^\[|\]$/g, ''), certificate),
      rejectUnauthorized: true,
      timeout: REQUEST_TIMEOUT_MS,
      maxHeaderSize: 16 * 1024,
      agent: false,
    }, (response) => {
      let responseExcerpt = '';
      let retainedBytes = 0;
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => {
        if (retainedBytes >= MAX_RESPONSE_BYTES) return;
        const remaining = MAX_RESPONSE_BYTES - retainedBytes;
        const chunkBuffer = Buffer.from(chunk, 'utf8');
        const retained = chunkBuffer.subarray(0, remaining);
        responseExcerpt += retained.toString('utf8');
        retainedBytes += retained.byteLength;
      });
      response.on('end', () => resolve({ status: Number(response.statusCode || 0), responseExcerpt }));
      response.on('error', reject);
      response.on('aborted', () => reject(new Error('The partner server closed the response before it completed.')));
    });

    request.on('timeout', () => request.destroy(new Error(`Partner postback timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds.`)));
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

export function getAffiliatePostbackSecret(affiliateUserId: string): string {
  const masterSecret = process.env.AUTH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-development-secret-change-before-deployment');
  if (!masterSecret) throw new Error('AUTH_SECRET must be configured before enabling affiliate postbacks.');
  return createHmac('sha256', masterSecret).update(`sportrz-affiliate-postback-v1:${affiliateUserId}`).digest('hex');
}

export async function sendAffiliatePostbackEvent(input: {
  destinationUrl: string;
  method?: AffiliatePostbackMethod;
  affiliateUserId: string;
  deliveryId?: string | number;
  payload: AffiliatePostbackPayload;
}): Promise<{ status: number; responseExcerpt: string }> {
  const method = input.method || 'POST';
  if (method !== 'POST' && method !== 'GET') throw new Error('Postback method must be POST or GET.');
  const normalized = normalizePostbackTemplate(input.destinationUrl);
  if (!normalized) throw new Error('Enter a valid public HTTPS postback URL.');

  const stringPayload = toStringValues(input.payload);
  const renderedUrl = replaceMacros(normalized, stringPayload);
  if (/\{[a-z_]+\}/i.test(renderedUrl)) throw new Error('The postback URL contains a macro that could not be replaced.');
  const target = new URL(renderedUrl);

  if (method === 'GET') {
    for (const [key, value] of Object.entries(stringPayload)) {
      if (!target.searchParams.has(key)) target.searchParams.set(key, value);
    }
  }
  if (target.toString().length > 2048) throw new Error('The expanded postback URL exceeds 2048 characters.');

  const pinnedAddress = await resolvePublicPostbackAddress(target.toString());
  const body = JSON.stringify(input.payload);
  const signature = createHmac('sha256', getAffiliatePostbackSecret(input.affiliateUserId)).update(body).digest('hex');
  const result = await sendPinnedPostback(target, pinnedAddress, method, input.payload, {
    'X-Sportrz-Event': String(input.payload.event || 'conversion'),
    ...(input.deliveryId !== undefined ? { 'X-Sportrz-Delivery-Id': String(input.deliveryId), 'Idempotency-Key': `sportrz-affiliate-${String(input.deliveryId)}` } : {}),
    'X-Sportrz-Signature': `sha256=${signature}`,
  });

  if (result.status < 200 || result.status >= 300) {
    throw Object.assign(new Error(`Partner endpoint returned HTTP ${result.status}. ${result.responseExcerpt}`), { httpStatus: result.status });
  }
  return result;
}

interface DeliveryRow extends RowDataPacket {
  id: number;
  affiliate_user_id: string;
  commission_id: number;
  destination_url: string;
  http_method: AffiliatePostbackMethod;
  commission_status: string;
  commission_paise: number;
  commission_percent: number;
  amount_paise: number;
  currency: string;
  order_id: string;
  provider_payment_id: string | null;
  paid_at: Date | string | null;
  payment_created_at: Date | string;
  referral_code: string;
  click_id: string | null;
}

export async function dispatchAffiliatePostbackDelivery(
  deliveryId: number,
  affiliateUserId: string,
): Promise<{ sent: boolean; alreadySent?: boolean; status?: number; error?: string }> {
  const pool = getPool();
  const [claim] = await pool.execute<ResultSetHeader>(
    `UPDATE affiliate_postback_deliveries
        SET status = 'sending', attempt_count = attempt_count + 1,
            last_attempt_at = UTC_TIMESTAMP(), last_error = NULL, updated_at = UTC_TIMESTAMP()
      WHERE id = ? AND affiliate_user_id = ?
        AND (status IN ('pending','failed') OR (status = 'sending' AND last_attempt_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 MINUTE)))`,
    [deliveryId, affiliateUserId],
  );

  if (!claim.affectedRows) {
    const [existing] = await pool.execute<Array<RowDataPacket & { status: string }>>(
      'SELECT status FROM affiliate_postback_deliveries WHERE id = ? AND affiliate_user_id = ? LIMIT 1',
      [deliveryId, affiliateUserId],
    );
    if (existing[0]?.status === 'sent') return { sent: true, alreadySent: true };
    return { sent: false, error: existing[0] ? 'This postback is already being processed.' : 'Postback delivery not found.' };
  }

  try {
    const [rows] = await pool.execute<DeliveryRow[]>(
      `SELECT d.id, d.affiliate_user_id, d.commission_id, d.destination_url, d.http_method,
              ac.status AS commission_status, ac.commission_paise, ac.commission_percent, ac.amount_paise,
              p.currency, p.order_id, p.provider_payment_id, p.paid_at, p.created_at AS payment_created_at,
              ap.referral_code, ar.click_id
         FROM affiliate_postback_deliveries d
         JOIN affiliate_commissions ac ON ac.id = d.commission_id
         JOIN payments p ON p.id = ac.payment_record_id
         JOIN affiliate_profiles ap ON ap.user_id = d.affiliate_user_id
         JOIN users au ON au.id = ap.user_id AND au.account_role = 'affiliate' AND au.status = 'active'
         LEFT JOIN affiliate_referrals ar
           ON ar.referred_user_id = ac.referred_user_id AND ar.affiliate_user_id = d.affiliate_user_id
        WHERE d.id = ? AND d.affiliate_user_id = ?
        LIMIT 1`,
      [deliveryId, affiliateUserId],
    );
    const delivery = rows[0];
    if (!delivery) throw new Error('The postback delivery is missing its commission, payment, or affiliate profile.');
    if (!delivery.destination_url) throw new Error('No external postback URL is configured for this affiliate.');

    const payload: AffiliatePostbackPayload = {
      event: 'conversion',
      commission_id: String(delivery.commission_id),
      affiliate_code: delivery.referral_code,
      click_id: delivery.click_id || '',
      order_id: delivery.order_id,
      payment_id: delivery.provider_payment_id || '',
      amount: (Number(delivery.amount_paise || 0) / 100).toFixed(2),
      currency: delivery.currency || 'INR',
      commission: (Number(delivery.commission_paise || 0) / 100).toFixed(2),
      commission_percent: Number(delivery.commission_percent || 0).toFixed(2),
      status: delivery.commission_status,
      occurred_at: delivery.paid_at
        ? new Date(delivery.paid_at).toISOString()
        : new Date(delivery.payment_created_at).toISOString(),
    };

    const response = await sendAffiliatePostbackEvent({
      destinationUrl: delivery.destination_url,
      method: delivery.http_method || 'POST',
      affiliateUserId,
      deliveryId: delivery.id,
      payload,
    });

    await pool.execute(
      `UPDATE affiliate_postback_deliveries
          SET status = 'sent', http_status = ?, response_excerpt = ?, last_error = NULL,
              sent_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP()
        WHERE id = ? AND affiliate_user_id = ?`,
      [response.status, response.responseExcerpt || null, deliveryId, affiliateUserId],
    );
    return { sent: true, status: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : 'Postback request failed.';
    const httpStatus = typeof error === 'object' && error !== null && 'httpStatus' in error
      ? Number((error as { httpStatus: unknown }).httpStatus)
      : null;
    await pool.execute(
      `UPDATE affiliate_postback_deliveries
          SET status = 'failed', http_status = ?, last_error = ?, updated_at = UTC_TIMESTAMP()
        WHERE id = ? AND affiliate_user_id = ?`,
      [Number.isInteger(httpStatus) ? httpStatus : null, message, deliveryId, affiliateUserId],
    );
    return { sent: false, status: Number.isInteger(httpStatus) ? httpStatus as number : undefined, error: message };
  }
}

export async function dispatchAffiliatePostbacksForPayment(paymentRecordId: number): Promise<void> {
  const [rows] = await getPool().execute<Array<RowDataPacket & { id: number; affiliate_user_id: string }>>(
    `SELECT d.id, d.affiliate_user_id
       FROM affiliate_postback_deliveries d
       JOIN affiliate_commissions ac ON ac.id = d.commission_id
      WHERE ac.payment_record_id = ? AND d.status IN ('pending','failed')
      ORDER BY d.id ASC LIMIT 5`,
    [paymentRecordId],
  );
  for (const row of rows) {
    await dispatchAffiliatePostbackDelivery(Number(row.id), row.affiliate_user_id);
  }
}
