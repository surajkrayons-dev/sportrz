# Sportrz Admin Control Center – review patch

This patch was made against `Sportrz-Admin-Control-Center.zip` and preserves the Next.js + MySQL architecture.

## Changes in this patch

- Added an Edit action to the subscription ledger. Admins with `subscriptions.manage` can change the assigned plan and duration; blank duration means no expiry.
- Updated the subscription PATCH API to validate input, lock the subscription row, update plan/expiry transactionally, and write an audit event. Existing status changes remain supported.
- Fixed the subscriptions status filter UI so it no longer offers `revoked` even though the schema/API stores revocations as `cancelled`.
- Game reviews now join the `games` table and display the game name instead of only an opaque game ID.
- Added a permission-checked moderation DELETE endpoint for general feedback and game reviews, with an audit event, and UI delete actions for users granted `feedback.manage` (super-admin access is still controlled by the existing permission helper).
- Added visible admin initial-load state and a global top progress indicator for asynchronous admin requests.
- Affiliate commission ledger entries, per-affiliate totals, per-referred-user revenue, team performance, and dashboard money metrics are currency-grouped (INR/USD/EUR/GBP) and no longer add different currencies into a false INR total.
- Added two affiliate types: admin-created managed affiliates and external-website partners. External partners can submit a website URL for admin review; after approval they receive their own referral code/profile. The same captured-payment commission pipeline applies to both types.
- Referral attribution is first-touch and server-side. Existing regular users may be attributed only if they verify through a valid referral link and do not already have an attribution; subsequent links cannot overwrite it.
- Added user create/edit and safe delete actions. Deletion is rejected for accounts with payment, subscription, or affiliate history; admins should suspend those accounts to preserve financial/attribution records.
- Added category edit/name/order visibility controls and team account suspension/reactivation controls.
- Added the external affiliate application page and footer navigation link.
- Fixed purchase order/payment verification handling for plans with no expiry (`duration_days = NULL`).

## Important before production

1. Run `npm ci`, then `npm run build` in the project environment. Dependency installation could not be completed in this execution environment, so a full TypeScript/Next.js build was not verified here.
2. Run the existing `database/migrations/20261028_admin_affiliate_portal.sql` migration if it has not already been applied.
3. Test with Razorpay test credentials first; do not use live credentials until test-mode purchases, refunds, subscription activation, and commission attribution have been verified.
4. Before launch, validate external affiliate application approval, referral link attribution, commission generation after captured payment, and each supported payment currency with a test affiliate account. Referrals require the actual tracked link to be placed on the external partner website; a submitted website URL by itself does not track sales.
5. Subscription edit currently changes the plan and expiry date of the selected record. It does not create a payment, issue a refund, or automatically prorate the difference. Use it for administrative corrections/manual access only.
6. Feedback/review deletion is destructive. It requires `feedback.manage` and records an audit entry.
