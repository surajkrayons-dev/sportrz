# External affiliate tracking and postbacks

## 1. How attribution works

1. An external affiliate shares their referral URL from **Admin → Affiliate marketing**.
2. The affiliate's tracking platform replaces `{click_id}` with its own unique click identifier before redirecting the visitor to Sportrz.
3. The visitor signs up using email OTP. On the first registration only, Sportrz stores the affiliate code and click ID against that user.
4. When that user completes a Razorpay purchase, Sportrz records the captured payment and creates one commission record for the attributed affiliate.
5. If the affiliate has configured a postback URL, Sportrz queues and sends a server-to-server HTTPS GET callback. Failed deliveries can be retried from the affiliate dashboard.

Existing accounts are not retroactively attributed when they log in through a referral link. This prevents an existing customer from being reassigned to another affiliate.

## 2. Referral URL template

External affiliate links include this parameter:

```text
https://sportrz.com/login?ref=YOUR_REFERRAL_CODE&click_id={click_id}
```

Replace `{click_id}` with the click-ID macro provided by the affiliate's own tracking platform. The value must contain 1–191 letters, digits, dots, underscores, tildes, or hyphens. Sportrz captures it during first-time email-OTP registration.

## 3. Postback URL setup

In the affiliate dashboard, enter a public HTTPS URL controlled by the partner's tracking platform. Example template:

```text
https://tracker.example.com/conversion?click_id={click_id}&order_id={order_id}&payment_id={payment_id}&amount={amount}&commission={commission}
```

Sportrz replaces these macros with URL-encoded values:

| Macro | Value |
|---|---|
| `{affiliate_code}` | The affiliate's referral code |
| `{click_id}` | The visitor's captured click ID |
| `{order_id}` | Razorpay order ID |
| `{payment_id}` | Razorpay payment ID |
| `{amount}` | Captured sale amount in major currency units |
| `{currency}` | Payment currency |
| `{commission}` | Commission amount in major currency units |
| `{commission_percent}` | Commission percentage |
| `{commission_id}` | Sportrz commission record ID |
| `{status}` | Commission status at callback time |

Sportrz also adds the following query parameters when the URL does not already contain them: `event`, `commission_id`, `affiliate_code`, `click_id`, `order_id`, `payment_id`, `amount`, `currency`, `commission`, `commission_percent`, `status`, and `occurred_at`.

The callback is sent only after the Razorpay payment is verified as `captured` and the commission record is committed. The endpoint must return a 2xx response for the delivery to be marked **sent**. Redirects are not followed. Local/private IP destinations are rejected.

## 4. Signature verification

Every callback includes:

- `X-Sportrz-Event: conversion`
- `X-Sportrz-Delivery-Id: <delivery id>`
- `X-Sportrz-Signature: sha256=<hex HMAC>`

The affiliate dashboard displays a per-affiliate signing secret. Keep it server-side. The HMAC-SHA256 input is the UTF-8 JSON string with the exact property order below:

```js
const payload = {
  event: query.event,
  commission_id: query.commission_id,
  affiliate_code: query.affiliate_code,
  click_id: query.click_id,
  order_id: query.order_id,
  payment_id: query.payment_id,
  amount: query.amount,
  currency: query.currency,
  commission: query.commission,
  commission_percent: query.commission_percent,
  status: query.status,
  occurred_at: query.occurred_at,
};

const expected = `sha256=${createHmac('sha256', POSTBACK_SECRET)
  .update(JSON.stringify(payload), 'utf8')
  .digest('hex')}`;
```

Compare `expected` with the received signature using a constant-time comparison. Do not trust a conversion merely because the callback URL was requested; verify its signature and deduplicate using `X-Sportrz-Delivery-Id` or `commission_id`.

## 5. Operational notes

- Configure a stable production `AUTH_SECRET`; the per-affiliate signing secret is derived from it and the affiliate account ID.
- Postback settings are private to the signed-in affiliate account. The affiliate API only returns that account's referrals, payment IDs, commissions, and delivery history.
- Commission records are idempotent per payment. Repeated verification requests or Razorpay webhook retries do not create duplicate commissions.
- The commission rate and amount are snapshotted when the commission is created. Changing an affiliate's rate affects future commissions, not existing ledger rows.

## 6. Deployment checklist

1. Copy `.env.example` to `.env.local` and configure the production MySQL credentials, Razorpay credentials, `NEXT_PUBLIC_APP_URL=https://sportrz.com`, and a long random `AUTH_SECRET`. Keep `AUTH_SECRET` stable between deployments because it derives each affiliate's postback signing secret.
2. Run `npm install` and then `npm run db:migrate:admin`. This applies the admin/affiliate schema, adds `click_id` and `postback_url`, creates the delivery ledger, and backfills commissions for previously captured qualifying Razorpay orders.
3. Deploy the updated Next.js application.
4. In an external affiliate account, copy the tracking link and replace `{click_id}` with the tracking platform's click-ID macro. Configure the partner's HTTPS postback URL in **Admin → Affiliate marketing**.
5. Test with a new email address and a unique click ID. Complete a Razorpay test payment and verify the click ID, order ID, payment ID, commission, and postback delivery status in that affiliate's dashboard.

Postbacks are dispatched after payment capture through the payment verification route and the Razorpay webhook settlement path. A webhook is useful for reliable server-side reconciliation, but a successful `/api/verify-payment` capture also creates the commission and attempts the callback. Failed callbacks remain in the delivery ledger for manual retry.
