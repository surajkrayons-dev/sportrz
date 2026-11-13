/** Canonical URL helpers for affiliate links.
 * Every public affiliate URL goes through /r/:code so Sportrz can create and
 * persist a first-party Click ID before sending the visitor to login.
 */
export function getPublicAppOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const fallback = process.env.NODE_ENV === 'production' ? 'https://sportrz.com' : 'http://localhost:3000';
  const candidate = configured || fallback;

  try {
    const parsed = new URL(candidate);
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) return fallback;
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') return fallback;
    return parsed.origin;
  } catch {
    return fallback;
  }
}

export function buildAffiliateReferralUrl(referralCode: string): string {
  return `${getPublicAppOrigin()}/r/${encodeURIComponent(referralCode)}`;
}
