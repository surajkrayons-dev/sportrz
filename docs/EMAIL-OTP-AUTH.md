# Sportrz email OTP authentication

## User flow

1. User opens Sign in or Sign up and enters an email address.
2. `POST /api/auth/send-otp` sends a six-digit code. Codes expire in 10 minutes and are rate-limited to one request per address every 60 seconds.
3. `POST /api/auth/verify-otp` validates the code, allowing five attempts.
4. Existing active users are signed in. For a new email, a user is created after the code is verified and is signed in immediately.
5. The server sets the existing HTTP-only `sportrz_session` cookie.

## Database

The current schema already supports this flow: `auth_tokens.purpose` includes `login_otp`; `auth_tokens.user_id` can be `NULL` until the code is confirmed; and `users.email` is unique. No additional migration is required.

## Local testing

Run `npm run db:check`, then `npm run dev`. With no Resend settings in development mode, the OTP is printed in the terminal and shown on the OTP screen. This development-only behavior is disabled in production.

## Production email delivery

Set `RESEND_API_KEY` and `EMAIL_FROM` in the server environment. `EMAIL_FROM` must be a sender address verified by Resend. Never expose `RESEND_API_KEY` or `AUTH_SECRET` in a `NEXT_PUBLIC_` variable.
