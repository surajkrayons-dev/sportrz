# Sportrz affiliate dashboard, Click ID, and S2S update

## What changed

- Fixed the affiliate-only commission transaction query so it joins `affiliate_referrals` before reading `click_id`.
- Added first-party click tracking through `/r/:referralCode`. Sportrz generates a cryptographically random Click ID and stores it in `affiliate_clicks` before redirecting to login.
- New registrations attach the click to `affiliate_referrals`. Existing accounts are not silently reassigned to a new affiliate.
- Added admin-managed outgoing S2S postbacks. Super Admin/configured affiliate managers own the HTTPS destination, method, signing secret, test event, and retry actions. Affiliate users only see their own read-only history.
- Reworked the S2S sender to validate public DNS/IP destinations and connect to the pinned public IP while preserving hostname-based TLS validation. This addresses the earlier `Invalid IP address: undefined` delivery failure.
- Added request identifiers and idempotency headers, bounded timeouts/response capture, and clearer delivery errors.
- Kept `affiliate_commissions` as the financial ledger and `affiliate_postback_deliveries` as a separate outbound HTTP delivery log.
- Improved the affiliate application copy and responsive dashboard/table layouts.

## Required database update

Run the additive migration after replacing the project files:

```powershell
npm run db:migrate:admin
npm run db:check
```

This migration adds `affiliate_clicks`, the postback method fields, and related schema. It does not delete existing data. Do not use `npm run db:migrate:fresh` for a normal update; that command is destructive.

## Test the S2S integration

1. Sign in as Super Admin and open **Admin → Affiliate marketing**.
2. Edit an active external affiliate.
3. Set the partner postback destination to a Webhook.site unique HTTPS URL, keep method `POST`, and save the profile.
4. Close and reopen the edit dialog, then click **Send test event**.
5. Confirm that Webhook.site receives a `POST` with a JSON body. Opening Webhook.site in a browser creates a `GET` request; that is not the S2S test.
6. Then test a real conversion with a clean Incognito session, the affiliate `/r/:code` link, a new customer email, and a Razorpay test payment.

Old referrals with a `NULL` Click ID are not assigned a fabricated value. The Click ID must be generated at the actual click, so use the updated `/r/:code` link for new tests.
