# Sportrz

Sportrz is a Next.js 15 application with a MySQL/MariaDB backend, email OTP authentication, Razorpay subscriptions, game catalogue management, and role-based admin/affiliate dashboards.

## Technology

- Next.js 15.3.5 App Router and React 19
- TypeScript
- MySQL / MariaDB through `mysql2`
- Email OTP authentication
- Razorpay orders, payment verification, and webhook reconciliation
- Tailwind CSS and Lucide icons

## Local setup (Windows PowerShell)

1. Install Node.js 20 LTS or a supported current LTS release.
2. Install dependencies:

   ```powershell
   npm install
   ```

3. Copy `.env.example` to `.env.local` and fill in your own MySQL, mail, Razorpay, and authentication values. Keep `.env.local` private; never upload it to source control or share it publicly.
4. Set `NEXT_PUBLIC_APP_URL=http://localhost:3000` for local development. In production, use your real HTTPS site origin (for example, `https://sportrz.com`).
5. Apply the additive admin/affiliate migrations:

   ```powershell
   npm run db:migrate:admin
   ```

6. Check the database schema:

   ```powershell
   npm run db:check
   ```

7. Start the development server:

   ```powershell
   npm run dev
   ```

Open `http://localhost:3000`.

## Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run typecheck` | Run the TypeScript compiler without emitting files |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server after a successful build |
| `npm run db:check` | Verify the MySQL connection and required tables/columns |
| `npm run db:migrate:admin` | Apply safe, additive admin, affiliate, click-tracking, and S2S migrations |
| `npm run db:migrate:fresh` | **Destructive:** drop and recreate every table, then leave all tables empty |

> Do not run `npm run db:migrate:fresh` for a normal update. It permanently deletes users, admins, games, plans, payments, subscriptions, affiliate records, settings, and logs in the configured database. Back up the database before any intentional reset.

## Affiliate tracking

- Super Admin approves affiliate applications and manages commission rates, account status, external postback destination, HTTP method, and retries.
- Affiliates share their own `/r/:referralCode` link. Sportrz creates a first-party Click ID on the server and associates it with new registrations.
- Existing accounts are not reassigned to an affiliate by visiting a referral link.
- A verified Razorpay captured payment creates one idempotent commission record. An external affiliate's configured S2S destination receives a server-to-server conversion event after the payment/commission transaction commits.
- `affiliate_commissions` is the financial ledger. `affiliate_postback_deliveries` is the outgoing HTTP delivery history. These are separate records.
- Affiliate users can view only their own referrals, orders, commissions, and read-only delivery history. Postback destinations and signing secrets are managed by administrators.

See [`docs/affiliate-postback-integration.md`](docs/affiliate-postback-integration.md) for the click attribution flow, S2S payload, Webhook.site test procedure, retry process, and production checklist.

## Production checklist

- Set a stable, strong `AUTH_SECRET` (do not rotate it without coordinating the affiliate signing-secret integration).
- Set `NEXT_PUBLIC_APP_URL` to the deployed HTTPS origin.
- Use production MySQL credentials and enable TLS where supported.
- Configure Razorpay live credentials and the Razorpay `payment.captured` webhook with its dedicated webhook secret.
- Configure SMTP for email OTP.
- Run `npm run db:migrate:admin`, `npm run db:check`, `npm run typecheck`, and `npm run build` before deployment.
- Never use test Webhook.site URLs as production conversion destinations.
