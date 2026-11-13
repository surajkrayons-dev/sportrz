# Sportrz affiliate tracking and S2S postbacks

This guide describes the current Next.js + MySQL implementation. Affiliate settings and partner destinations are controlled by Super Admin; an affiliate marketer only shares their referral link and sees their own activity.

## 1. Affiliate application and approval

1. A signed-in regular user opens `/affiliate/apply` and submits a website or public promotional channel they own or are authorized to use.
2. The submitted website URL is for admin review only. It is **not** a postback URL and does not generate Click IDs.
3. A Super Admin reviews the application and approves or rejects it from **Admin → Affiliate marketing**.
4. On approval, Sportrz creates an active external affiliate profile, referral code, commission rate, and first-party referral link.

## 2. First-party Click ID attribution

The canonical referral link is:

```text
https://sportrz.com/r/SP-REFERRAL-CODE
```

When a visitor opens `/r/:code`, Sportrz:

1. Validates that the affiliate profile is active.
2. Accepts a valid partner `click_id` query parameter when one is supplied; otherwise generates a cryptographically random first-party Click ID (`clk_<random>`).
3. Stores the click in `affiliate_clicks`.
4. Sets short data-only HTTP-only attribution cookies and redirects the visitor to the email OTP login page with the referral code and Click ID.
5. On a **new account registration**, associates the Click ID with the new user in `affiliate_clicks` and `affiliate_referrals`.

The affiliate shares the `/r/:code` link as-is. They do not need to create or edit a `{click_id}` placeholder. A third-party tracker may append its own unique `click_id` parameter if it is being used. Existing customer accounts are not reassigned to a new affiliate when they log in through a referral link.

A click becomes a referred sign-up only after a new user registers. A test using an already-registered email will not create a second referral attribution.

## 3. Payment and commission flow

1. Sportrz creates the Razorpay order and keeps the authenticated user's referral association server-side.
2. The payment is accepted only after Razorpay signature/payment verification or the Razorpay webhook confirms `captured`.
3. `ensureAffiliateCommissionForPayment` creates one commission per captured payment using the referral's affiliate and commission rate.
4. For an active external affiliate with an admin-configured destination, Sportrz creates an outbox row in `affiliate_postback_deliveries`.
5. The payment transaction is committed before network delivery. A partner outage never rolls back a captured customer payment.

Commission records and postback delivery records are separate: `affiliate_commissions` is the financial ledger; `affiliate_postback_deliveries` is the outbound HTTP delivery log.

## 4. Configure the S2S destination (Super Admin only)

1. Open **Admin → Affiliate marketing**.
2. Find the external affiliate and select **Edit**.
3. Under **Server-to-server (S2S) postback**, paste the partner's receiving HTTPS endpoint. For a temporary test, use the unique URL shown by [Webhook.site](https://webhook.site/).
4. Leave the method as **POST** (recommended) and save the profile.
5. Close and reopen the affiliate editor, then select **Send test event**. The test sends dummy data and does not create a payment or commission.
6. Confirm that Webhook.site shows a `POST` request with a JSON body. A browser `GET` request caused by opening the Webhook.site page is not an S2S test.

The affiliate marketer cannot view or edit the destination URL or signing secret. They only see read-only delivery status for their own conversions.

## 5. S2S payload and macros

For `POST`, Sportrz sends JSON. A plain receiver URL such as `https://webhook.site/<unique-id>` is sufficient; URL macros are optional. The JSON body contains:

```json
{
  "event": "conversion",
  "commission_id": "123",
  "affiliate_code": "SP-REFERRAL-CODE",
  "click_id": "clk_example",
  "order_id": "order_example",
  "payment_id": "pay_example",
  "amount": "100.00",
  "currency": "INR",
  "commission": "10.00",
  "commission_percent": "10.00",
  "status": "pending",
  "occurred_at": "2026-11-10T12:00:00.000Z"
}
```

If the partner requires values in the URL, supported macros are `{affiliate_code}`, `{click_id}`, `{order_id}`, `{payment_id}`, `{amount}`, `{currency}`, `{commission}`, `{commission_percent}`, `{commission_id}`, and `{status}`. Sportrz URL-encodes substituted values. `GET` exists only as a compatibility option; use `POST` for new integrations.

Every request includes:

- `Content-Type: application/json; charset=utf-8`
- `X-Sportrz-Event: conversion` (or `test` for the admin test event)
- `X-Sportrz-Signature: sha256=<hex HMAC-SHA256>`
- `X-Sportrz-Delivery-Id` and `Idempotency-Key` for delivery tracing/deduplication.

The per-affiliate signing secret is derived from the stable server-side `AUTH_SECRET` and affiliate user ID. Super Admin can copy it from the affiliate editor and securely share it with the receiving server. Never put it in browser code, public links, or source control. The receiver should verify the HMAC against the exact raw JSON request body using constant-time comparison.

Sportrz accepts only public HTTPS destinations on the standard port, resolves and validates the destination IP, and connects to the validated IP while retaining the original hostname for TLS SNI and certificate validation. It does not follow redirects. A 2xx response marks a delivery as `sent`; non-2xx responses, DNS errors, TLS failures, and timeouts are recorded as `failed` with an error detail.

## 6. Retry and history

- Failed and pending deliveries appear in the Super Admin commission ledger with attempts, HTTP status, and the last error.
- Super Admin can retry a delivery from the ledger.
- When an S2S URL is first configured, eligible historical commission entries are queued once; they can then be retried from the ledger.
- The affiliate's dashboard shows only that affiliate's own Click IDs, referrals, commissions, and read-only postback delivery history.
- A test event is visible at the test receiver and in the admin audit log; it does not create a commission ledger row.

## 7. Database migration and local testing

After replacing the project files, preserve the current `.env.local` and run:

```powershell
npm install
npm run db:migrate:admin
npm run typecheck
npm run dev
```

Do **not** run `npm run db:migrate:fresh` for an ordinary update. It deletes all data in the configured database.

For a complete local test:

1. Use a Super Admin account to approve an external affiliate application.
2. Open its **Edit** modal and configure the Webhook.site unique HTTPS URL, with method `POST`.
3. Save, close, and reopen the modal; click **Send test event**. Webhook.site should show a `POST` with JSON. If not, inspect the API response and the server terminal.
4. Test real attribution using the affiliate's `/r/:code` link in a clean Incognito session and a brand-new email address. Existing users are intentionally not reassigned.
5. Complete a Razorpay test payment and confirm the new Click ID, order ID, payment ID, commission and S2S delivery in the database and both dashboards.

For production, use `NEXT_PUBLIC_APP_URL=https://sportrz.com`, a strong stable `AUTH_SECRET`, real database/Razorpay credentials, and the Razorpay webhook for reliable server-side payment reconciliation. `npm run db:migrate:admin` is additive/idempotent; it does not erase application data.
