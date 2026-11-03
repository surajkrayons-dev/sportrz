# Sportrz Admin Control Center — final review notes

## Included in this package

- Managed/admin-created affiliate accounts and external-website affiliate applications.
- External application approval/rejection, site URL records, individual commission rates and unique referral codes.
- First-touch referral attribution at OTP verification, including regular existing users who have no prior attribution; later links cannot overwrite an existing referral.
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

## Verification performed / limitations

- Changed TypeScript/TSX files were run through the globally installed TypeScript transpiler with syntax diagnostics enabled.
- Node script syntax and JSON configuration are checked as well.
- Full Next.js semantic type-check/production build could not be completed in this environment because package installation (`npm ci`) timed out. No live MySQL, SMTP, DNS, or Razorpay account was available for end-to-end tests.
- Before production launch, run `npm ci`, `npm run db:migrate:admin`, `npm run db:check`, and `npm run build` on your deployment/build machine. Test both affiliate types and permissions, OTP verification/referral attribution, INR and any enabled international currency, duplicate webhook delivery, refunds, selected-game denial, and subscription expiry using Test credentials.
- Game URLs in the current imported catalogue point to public static files; direct asset-origin access must be protected separately to make premium entitlements tamper-resistant.
