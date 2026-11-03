# Application Flow — Sportrz

## User flow

1. A visitor opens the home page and browses the game catalog by category or search.
2. A user registers with email/password, verifies the email, and signs in; Google OAuth is optional.
3. Signed-in users can manage their profile, play games, see recently played games, and use notifications.
4. Users can submit contact messages and feedback.
5. Signed-in users can purchase an enabled plan through Razorpay. The server verifies the payment with Razorpay and stores the payment/subscription records in MySQL.

## Data flow

- `games` plus `game_categories` provide the catalog; category metadata is stored in `categories`.
- `users`, `auth_tokens`, and `oauth_accounts` handle identity and verification data.
- `game_play_history` and `notifications` store per-user activity.
- `payments`, `plans`, and `subscriptions` record purchases and access periods.
- `contact_messages` and `feedback` store user submissions.
- Protected admin APIs verify the signed session and the `users.is_admin` flag before changing catalog data.
