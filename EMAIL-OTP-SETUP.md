# Sportrz email OTP using Next.js API routes and SMTP

This implementation keeps the OTP API and database logic inside Next.js:

- `POST /api/auth/send-otp` generates a 6-digit code, stores only its hash in MySQL `auth_tokens`, and sends the code through SMTP.
- `POST /api/auth/verify-otp` validates the code. It signs in an existing active user, or creates a new MySQL `users` record only after successful OTP verification and signs that user in.
- OTPs expire after 10 minutes, can only be used once, and have a 60-second resend cooldown plus a 5-attempt limit.

Next.js can create and verify the OTP itself, but an email server is still required to deliver messages to inboxes. This patch uses a mailbox's SMTP service (typically provided in cPanel) instead of the Resend API.

## 1. Install SMTP mailer dependency

Run in the project's root folder (`D:\next.js\sportrz`):

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

## 2. Create/choose a sender mailbox in cPanel

1. Open cPanel > **Email Accounts**.
2. Create a mailbox such as `no-reply@your-domain.com`, or select an existing mailbox.
3. Open **Connect Devices** / **Set Up Mail Client** for that mailbox.
4. Copy the server's exact SMTP hostname, port, and encryption setting. Do not assume the host is `localhost`.
5. Keep the full mailbox address and its mailbox password ready. The mailbox password is not the MySQL password.

Common configurations are port `465` with `SMTP_SECURE=true`, or port `587` with `SMTP_SECURE=false`; use the values cPanel actually lists for your mailbox.

## 3. Configure `.env.local`

Create or edit `D:\next.js\sportrz\.env.local`. Keep the existing working MySQL settings and `AUTH_SECRET`. Replace/add only these email variables with real mailbox details:

```dotenv
SMTP_HOST=the-smtp-host-shown-in-cpanel
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@your-domain.com
SMTP_PASS=THE_MAILBOX_PASSWORD
EMAIL_FROM="Sportrz <no-reply@your-domain.com>"
```

If cPanel specifies port 587, use `SMTP_PORT=587` and `SMTP_SECURE=false`. `EMAIL_FROM` should use the authenticated mailbox address or another sender that your mail host explicitly permits. Do not use `NEXT_PUBLIC_` prefixes for SMTP credentials, commit `.env.local`, or paste your real mailbox password into chats/screenshots.

## 4. Restart and test

Stop the running development server with `Ctrl+C`, then run:

```bash
npm run db:check
npm run dev
```

Open the local app and choose **Continue with email**. Enter an inbox you can access, wait for the OTP, and verify it. If mail sending fails, check the Next.js terminal for the SMTP server's error message and verify the host, port, encryption, mailbox credentials, and sender address.

## Security notes

- No email-provider API key is needed for this SMTP implementation.
- Real OTPs are never returned to the browser or printed to the terminal.
- SMTP credentials must stay server-side in `.env.local` locally and the server environment in production.
- The MySQL schema already contains `auth_tokens` with the `login_otp` purpose, so no database migration is required for the OTP flow.
