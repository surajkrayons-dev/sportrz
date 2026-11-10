# Sportrz affiliate commission dashboard fix

## Root cause

The affiliate-only branch of `GET /api/admin/affiliates` selected `ar.click_id` but did not join the `affiliate_referrals` table as `ar`. MySQL therefore rejected the affiliate ledger query. The dashboard summary numbers came from the separate `/api/admin/dashboard` endpoint, so referral/revenue/commission cards could show values while the affiliate's transaction table remained empty. The super-admin ledger used a different query and continued to show the commission.

## Changes

- Added a `LEFT JOIN affiliate_referrals` scoped to both `referred_user_id` and `affiliate_user_id` in the affiliate transaction query. Existing commission entries continue to appear even if click ID is null.
- Added Click ID and Postback status columns to the external affiliate's latest-commission table. Internal affiliates retain the simpler table.
- Added a Send action for queued postback deliveries. A pending delivery can now be explicitly dispatched; failed deliveries can be retried.
- Clarified that `affiliate_postback_deliveries` is the outbound callback history, not the commission ledger.

## Important table distinction

- `affiliate_commissions` stores earned commission records. The super-admin screenshot already showed the qualifying ₹1.50 commission in this table.
- `affiliate_postback_deliveries` stores attempts to call an external tracking endpoint. It remains empty until an external affiliate configures a postback URL. This is expected when the admin row says `Postback: not configured`.

## Apply the code fix

1. Stop the dev server with `Ctrl + C`.
2. Replace the matching project files from this ZIP (or replace the project using the included files while preserving `.env.local`).
3. Start the app again with `npm run dev`.
4. Sign in as the affected affiliate and open `/admin`; the commission row should now include Order ID and Payment ID.

No new database migration is required for this query/UI correction. Existing affiliate tables and the commission row are retained.
