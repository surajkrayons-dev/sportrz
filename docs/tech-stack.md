# Sportrz — Current Tech Stack

## Frontend
- Next.js App Router (Next.js 15)
- React 19 and TypeScript
- Tailwind CSS

## Backend
- Next.js Route Handlers (`src/app/api/**`)
- `mysql2/promise` connection pool for MySQL
- HTTP-only, HMAC-signed session cookie
- Password hashing with Node.js `scrypt`
- Optional Google OAuth 2.0 sign-in

## Database
- MySQL / compatible MySQL service
- Schema: `database/schema.sql`
- Local environment template: `.env.example`
- Game catalog importer: `upload-games.js`

## Integrations
- Razorpay for one-day, weekly, and monthly access plans
- Cloudinary for administrator-uploaded game thumbnails
- Resend for production email verification and password-reset emails

## Deployment
- Node.js hosting that can run the Next.js production server
- Configure the production database, authentication secret, email provider, OAuth, Razorpay, and Cloudinary through server-side environment variables
- Verify database connectivity at `/api/health` after deployment
