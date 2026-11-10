import { createHmac } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import https from 'node:https';
import { isIP } from 'node:net';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';

const ALLOWED_MACROS = new Set([
  'affiliate_code',
  'click_id',
  'order_id',
  'payment_id',
  'amount',
  'currency',
  'commission',
  'commission_percent',
  'commission_id',
  'status',
]);

function isPublicIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return !(
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPublicIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice('::ffff:'.length);
    if (isIP(mapped) === 4) return isPublicIpv4(mapped);
    return false;
  }
  if (normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb') || normalized.startsWith('ff') || normalized.startsWith('2001:db8:')) return false;
  // Public IPv6 unicast addresses are in 2000::/3.
  const firstSegment = Number.parseInt(normalized.split(':')[0] || '0', 16);
  return Number.isFinite(firstSegment) && (firstSegment & 0xe000) === 0x2000;
}

function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPublicIpv4(address);
  if (version === 6) return isPublicIpv6(address);
  return false;
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
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) return null;
    if (parsed.port && parsed.port !== '443') return null;
    const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) return null;
    return template;
  } catch {
    return null;
  }
}

async function resolvePublicPostbackAddress(value: string): Promise<{ address: string; family: 4 | 6 }> {
  const parsed = new URL(value);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();

  if (isIP(hostname)) {
    const family = isIP(hostname);
    if (!isPublicAddress(hostname)) throw new Error('The postback host must be a public internet address.');
    return { address: hostname, family: family as 4 | 6 };
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
  const selected = addresses[0];
  return { address: selected.address, family: selected.family as 4 | 6 };
}

export async function assertPublicPostbackUrl(value: string): Promise<void> {
  const normalized = normalizePostbackTemplate(value);
  if (!normalized) throw new Error('Use a valid public HTTPS postback URL. Only supported macros are allowed.');
  const sampleValues = Object.fromEntries([...ALLOWED_MACROS].map((macro) => [macro, 'sample-value'])) as Record<string, string>;
  await resolvePublicPostbackAddress(replaceMacros(normalized, sampleValues));
}

function sendPinnedPostback(
  target: URL,
  pinnedAddress: { address: string; family: 4 | 6 },
  headers: Record<string, string>,
): Promise<{ status: number; responseExcerpt: string }> {
  return new Promise((resolve, reject) => {
    const request = https.request(target, {
      method: 'GET',
      headers,
      timeout: 8000,
      maxHeaderSize: 16 * 1024,
      // Pin the DNS result we just validated to prevent DNS-rebinding SSRF.
      lookup: (_hostname, _options, callback) => {
        callback(null, pinnedAddress.address, pinnedAddress.family);
      },
    }, (response) => {
      let responseExcerpt = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => {
        if (responseExcerpt.length < 500) responseExcerpt += chunk.slice(0, 500 - responseExcerpt.length);
      });
      response.on('end', () => {
        resolve({ status: Number(response.statusCode || 0), responseExcerpt });
      });
      response.on('error', reject);
    });

    request.on('timeout', () => request.destroy(new Error('Partner postback timed out after 8 seconds.')));
    request.on('error', reject);
    request.end();
  });
}

export function getAffiliatePostbackSecret(affiliateUserId: string): string {
  const masterSecret = process.env.AUTH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-development-secret-change-before-deployment');
  if (!masterSecret) throw new Error('AUTH_SECRET must be configured before enabling affiliate postbacks.');
  return createHmac('sha256', masterSecret).update(`sportrz-affiliate-postback-v1:${affiliateUserId}`).digest('hex');
}

interface DeliveryRow extends RowDataPacket {
  id: number;
  affiliate_user_id: string;
  commission_id: number;
  destination_url: string;
  delivery_status: string;
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
      `SELECT d.id, d.affiliate_user_id, d.commission_id, d.destination_url,
              d.status AS delivery_status, ac.status AS commission_status,
              ac.commission_paise, ac.commission_percent, ac.amount_paise,
              p.currency, p.order_id, p.provider_payment_id, p.paid_at,
              p.created_at AS payment_created_at,
              ap.referral_code, ar.click_id
         FROM affiliate_postback_deliveries d
         JOIN affiliate_commissions ac ON ac.id = d.commission_id
         JOIN payments p ON p.id = ac.payment_record_id
         JOIN affiliate_profiles ap ON ap.user_id = d.affiliate_user_id
         JOIN affiliate_referrals ar ON ar.referred_user_id = ac.referred_user_id AND ar.affiliate_user_id = d.affiliate_user_id
        WHERE d.id = ? AND d.affiliate_user_id = ?
        LIMIT 1`,
      [deliveryId, affiliateUserId],
    );
    const delivery = rows[0];
    if (!delivery) throw new Error('The postback delivery is missing its commission or referral record.');

    const payload = {
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

    const rendered = replaceMacros(delivery.destination_url, payload);
    const target = new URL(rendered);
    const defaultParams: Record<string, string> = {
      event: payload.event,
      commission_id: payload.commission_id,
      affiliate_code: payload.affiliate_code,
      click_id: payload.click_id,
      order_id: payload.order_id,
      payment_id: payload.payment_id,
      amount: payload.amount,
      currency: payload.currency,
      commission: payload.commission,
      commission_percent: payload.commission_percent,
      status: payload.status,
      occurred_at: payload.occurred_at,
    };
    for (const [key, value] of Object.entries(defaultParams)) {
      if (!target.searchParams.has(key)) target.searchParams.set(key, value);
    }
    if (target.toString().length > 2048) throw new Error('The expanded postback URL exceeds 2048 characters.');
    // Validate the fully expanded callback and pin its resolved public address
    // for this HTTPS request. Redirects are not followed.
    const pinnedAddress = await resolvePublicPostbackAddress(target.toString());
    const signature = createHmac('sha256', getAffiliatePostbackSecret(affiliateUserId))
      .update(JSON.stringify(payload))
      .digest('hex');
    const response = await sendPinnedPostback(target, pinnedAddress, {
      Accept: 'application/json, text/plain, */*',
      'X-Sportrz-Event': 'conversion',
      'X-Sportrz-Delivery-Id': String(delivery.id),
      'X-Sportrz-Signature': `sha256=${signature}`,
    });
    if (response.status < 200 || response.status >= 300) {
      throw Object.assign(new Error(`Partner endpoint returned HTTP ${response.status}. ${response.responseExcerpt}`), { httpStatus: response.status });
    }

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
    const httpStatus = typeof error === 'object' && error !== null && 'httpStatus' in error ? Number((error as { httpStatus: unknown }).httpStatus) : null;
    await pool.execute(
      `UPDATE affiliate_postback_deliveries
          SET status = 'failed', http_status = ?, last_error = ?, updated_at = UTC_TIMESTAMP()
        WHERE id = ? AND affiliate_user_id = ?`,
      [Number.isInteger(httpStatus) ? httpStatus : null, message, deliveryId, affiliateUserId],
    );
    return { sent: false, status: typeof httpStatus === 'number' && Number.isInteger(httpStatus) ? httpStatus : undefined, error: message };
  }
}

export async function dispatchAffiliatePostbacksForPayment(paymentRecordId: number): Promise<void> {
  const [rows] = await getPool().execute<Array<RowDataPacket & { id: number; affiliate_user_id: string }>>(
    `SELECT id, affiliate_user_id
       FROM affiliate_postback_deliveries
      WHERE commission_id IN (SELECT id FROM affiliate_commissions WHERE payment_record_id = ?)
        AND status IN ('pending','failed')
      ORDER BY id ASC LIMIT 5`,
    [paymentRecordId],
  );
  for (const row of rows) {
    await dispatchAffiliatePostbackDelivery(Number(row.id), row.affiliate_user_id);
  }
}
