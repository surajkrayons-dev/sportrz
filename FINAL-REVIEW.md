# Sportrz Admin Control Center — final review notes

## Included in this package

- Managed/admin-created affiliate accounts and external-website affiliate applications.
- External application approval/rejection, site URL records, individual commission rates and unique referral codes.
- First-touch referral attribution for new registrations only; existing customer accounts are not reassigned when they revisit a referral link.
- Commission records only for captured/verified payments made after the referral attribution time; totals, referrals and dashboard revenue are grouped by currency to avoid adding INR/USD/EUR/GBP together.
- Affiliate endpoint scoping: an affiliate can see only their own profile, referred users and commission ledger. Internal admins and appropriately permissioned sub-admins see broader data.
- User create/edit/suspend/delete (delete is denied when payment, subscription or affiliate history exists), category edit/reorder/hide, plan CRUD with selected game mapping, subscription edit/assign/revoke and safer no-expiry handling.
- Razorpay key settings (encrypted at rest), payment verification, an idempotent `payment.captured` webhook endpoint, and a zero-cost subscription path.
- Loading/disabled states for asynchronous actions in the admin interface.

## Required setup

1. Copy source files into the existing project, preserving `.env.local`.
2. Configure stable `SETTINGS_ENCRYPTION_KEY` and production `NEXT_PUBLIC_APP_URL=https://sportrz.com`.
3. Run `npm run db:migrate:admin` so both admin/affiliate migrations apply, then `npm run db:check`.
4. In Admin → Settings & Razorpay, save a matching key ID/key secret and selected Test/Live mode. For webhook recovery, configure `https://sportrz.com/api/webhooks/razorpay` in Razorpay, subscribe to `payment.captured`, and save the same webhook secret in the panel.
5. Keep commissions currency-specific. Commission state `paid` is an accounting marker after an actual external bank/UPI transfer; it does not initiate that transfer.

## Affiliate S2S update

- Sportrz now creates its own first-party Click ID at `/r/:referralCode`, persists the click, and associates it with new registrations. Historical referrals with a NULL Click ID remain NULL rather than receiving a made-up identifier.
- Super Admin configures the external destination and can send a test event before triggering a paid conversion. Affiliate users cannot edit postback endpoints or signing secrets.
- Payment capture commits first; commission/outbox creation is idempotent, and a partner delivery failure does not roll back a successful customer payment.
- See `docs/affiliate-postback-integration.md` for the current setup and test procedure.

## Verification performed / limitations

- `npm run typecheck` passes. Node syntax checks pass for the database migration/check scripts.
- A production Next.js build could not be completed in this Linux execution environment because the optional Next.js Linux SWC binary is not installed; the environment also cannot reach the npm registry to install it. Re-run `npm install` and `npm run build` on the Windows/deployment machine.
- No live MySQL, SMTP, DNS, or Razorpay account was available for end-to-end testing in this environment. Test both affiliate types, OTP attribution with a new email, test-mode Razorpay capture, the S2S test event, duplicate webhooks, refunds, and subscription expiry before production launch.
- Game URLs in the current imported catalogue point to public static files; direct asset-origin access must be protected separately to make premium entitlements tamper-resistant.
