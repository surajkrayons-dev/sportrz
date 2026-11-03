# Sportrz Affiliate Commission & UTC Fix

This is a focused source patch for the existing Sportrz Next.js project. It does not replace the whole project and does not change `.env.local` or require a database migration.

## Files included

Copy these files into the same paths in `D:\next.js\sportrz`, replacing the existing ones:

- `src/app/api/auth/verify-otp/route.ts`
- `src/app/api/verify-payment/route.ts`
- `src/lib/affiliate-commission.ts` (new file)

## What it fixes

1. New affiliate referrals explicitly write `created_at = UTC_TIMESTAMP()` instead of relying on MariaDB's `CURRENT_TIMESTAMP` timezone.
2. Commission generation is centralized and idempotent. It only considers captured Razorpay payments, qualified referrals, and active affiliate profiles/accounts.
3. `INSERT IGNORE` plus the existing unique key on `affiliate_commissions.payment_record_id` prevents duplicate commission rows if payment verification is retried.
4. If the API sees an already-captured payment, it attempts the idempotent commission write before returning success. This supports recovery where a payment was captured by an older code version but the commission row was missing.
5. The commission generation does not compare `ar.created_at` to `p.paid_at`; old referral rows can have local-time `created_at` while `paid_at` is UTC. The referral record itself is the attribution; the normal flow creates it during verified signup, before checkout.

## Apply

1. Back up the current three files.
2. Extract this ZIP and copy its `src` directory contents into the existing `D:\next.js\sportrz` project, preserving folders and choosing Replace if asked.
3. Do not change `.env.local`.
4. Run:

```powershell
npm install
npm run build
```

No SQL update is required for this patch. Your currently repaired commission rows for payment IDs 3 and 4 are left alone. If a commission already exists, retries do not create a duplicate.

## Notes

- This fixes the application code for future referral writes and payment verification. It does not blindly shift historical referral timestamps, because some older rows may already have been corrected manually.
- The commission remains `pending` until an authorized admin approves and pays it.
- A successful build should still be verified in your Windows project; live Razorpay and SMTP checks require your own configured credentials.
