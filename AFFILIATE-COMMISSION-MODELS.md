# Sportrz Affiliate Commission Models

This project supports two administrator-controlled earning models. An affiliate cannot select or change their own model or rate. A Super Admin (or a staff account with the `affiliates.manage` permission) chooses the model when creating an affiliate, approving an application, or editing an existing affiliate profile.

## 1. Plan purchase (revenue share)

- Rate: a percentage of an eligible plan payment.
- A commission is created only after the payment is verified as `captured` by the Razorpay settlement/verification flow.
- Clicks and sign-ups are analytics only; they do not earn money in this model.
- Example: a customer pays ₹1,000 for a plan and the admin rate is 10%. The commission is ₹100.
- The commission row stores the payment record, order ID, payment ID, paid amount, percentage, commission amount and status.
- For external website affiliates, an administrator-configured S2S destination can receive the signed purchase-conversion postback.

## 2. Pay per valid click (CPC)

- Rate: a fixed rupee amount per valid click, not a percentage of clicks.
- The `/r/:referralCode` route creates a first-party Click ID and records the visit before redirecting the visitor to login.
- A click is billable at most once per affiliate, per browser visitor, per UTC calendar day. Repeat visits from that browser to the same affiliate on that day remain analytics-only.
- Known crawler, link-preview and monitoring user agents are recorded as non-billable.
- A click reward is created immediately for an eligible billable click; a customer registration or plan purchase is not required.
- Example: the admin sets ₹1.50 per valid click. 100 valid clicks produce ₹150 in click rewards. 20 repeat visits do not add another 20 rewards.
- Click rewards are stored in `affiliate_commissions` with `commission_model = 'pay_per_click'`, the click record ID, fixed rate and reward amount. They have no customer payment/order record by design.
- Purchase S2S postbacks are not created for CPC click-reward rows. Click rewards remain in the commission/payout ledger.

## Valid-click policy and fraud limitations

The current first-party policy uses an HTTP-only random browser cookie, a per-affiliate/per-UTC-day unique billable key, and a user-agent exclusion list for common bots and link-preview services. This reduces repeat-click and obvious crawler abuse, but it is not a guarantee against sophisticated fraud, cookie clearing, device switching, VPNs or headless browsers. Before running a large paid traffic campaign, add operational review thresholds and monitor unusual click bursts/conversion patterns.

## Admin workflow

1. **Create affiliate:** choose account type, affiliate type, earning model and the matching rate.
2. **Approve application:** select the earning model and rate before approval.
3. **Edit affiliate:** change the model/rate for future activity. Existing ledger entries remain unchanged.
4. **Review performance:** the admin list shows visits, valid clicks, referrals, paid conversions, conversion ratio, total commission and pending commission.
5. **Payout:** approve the commission, then mark it paid only after the actual payout has been completed. The admin panel does not transfer money automatically.

## Affiliate dashboard

The affiliate sees only the earning model and rate selected by the admin, along with their own referral link, clicks, referred users, transactions and commissions. The model selector and S2S endpoint settings are not exposed to the affiliate.

## Database update

Run the additive migration (preserves current users, games, plans, payments and affiliate records):

```powershell
npm run db:migrate:admin
```

Do **not** use `npm run db:migrate:fresh` on a populated database; that command drops and rebuilds all tables and deletes all data.
