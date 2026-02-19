# User paid (Pro) but sees Free plan after email login (e.g. on mobile)

## Cause

1. User **signed up with email** first → one user row created: `plan=free`, no `stripeCustomerId`.
2. User **paid via Stripe** (e.g. from another device or without being logged in) → Stripe created a new customer. The webhook created a **second** user row keyed by `stripeCustomerId`, with `plan=pro`.
3. When the user **logs in with email** on mobile (or any device), the server looks up by **email** and returns the **first** user — the original free account. So the app shows 60 min and Free plan.

So the same person had two accounts: one by email (free), one by Stripe customer (pro). Email login always hit the free one.

## Fix (code)

The Stripe webhook now **links by email** before creating a new user:

- When `checkout.session.completed` (or invoice) is processed, we still look up by `stripeCustomerId` first.
- If not found and we have the customer’s **email**, we look up an existing user by that email. If found, we **update that user** with `stripeCustomerId` and then apply the plan/subscription as usual. We do **not** create a second user.
- So after this change, paying with an email that already has an account will upgrade that same account. Email login on any device will then show the correct plan.

Deploy the updated `server` (with the webhook change) so all **new** payments link to the existing email account.

## For users already affected

If a user already has two rows (one by email, one by Stripe) and reports “I paid but I see Free” after email login:

1. **Identify both rows** in your DB (e.g. by email and by `stripeCustomerId` from Stripe dashboard).
2. **Update the email user** so it has the correct plan and (optionally) the same `stripeCustomerId` as the Stripe-created row, then use that single row going forward. Or merge usage and keep the email user, set `stripeCustomerId` and `plan` from the Stripe row, and delete or deactivate the duplicate Stripe-only row.
3. Ask the user to **log out and log in again** (or clear site data and log in) so the JWT and client plan refresh from the updated user.

## Additional safeguards (code)

1. **Login by email prefers the paid account** — If multiple users exist with the same email, `getUserByEmail` returns the one with `stripeCustomerId` first, so login shows the paid plan.
2. **Re-sync plan on login** — If the user has `stripeCustomerId` but `plan` is still `free`, the server re-fetches the active subscription from Stripe and updates the user before issuing the JWT.

## Mobile-specific note

On mobile, the app doesn’t “remember” the post-checkout session — the user typically logs in with email later. So the plan they see comes only from the **login** response (server returns `user.plan`). Fixing the server so the email user is upgraded (and not duplicated) fixes the issue for all devices.
