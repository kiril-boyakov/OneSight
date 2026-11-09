# Private inquiries and email alerts

The code is ready, but submission is deliberately disabled until storage is configured. Reviews keep working independently.

## 1. Add inquiry storage

In the existing Supabase project `tkzmuhxuiqccfyeorxyl`, open SQL Editor and execute `supabase/inquiries.sql` once. This is an additive migration; it does not alter reviews. Both new tables use RLS, with public and signed-in direct access revoked. All inquiry access goes through the server and the existing owner check.

Existing Vercel production variables are reused: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `REVIEW_ADMIN_ID`, `REVIEW_RATE_SALT`. Do not put credentials in source, chat, or frontend code.

When `GET https://1sight.eu/api/inquiries?ready=1` returns `{"ready":true}`, the public form enables automatically. No redeployment is needed for the SQL-only step.

## 2. Configure private email alerts

Create a Resend account if needed, then add and verify a sending domain/subdomain you control (for example `notifications.1sight.eu`). Copy the exact DNS records Resend provides to your DNS host; do not replace existing website or mailbox records. Check the current plan and sending limits before choosing a plan; no paid plan is required by this code and no purchase has been made.

Create a restricted sending API key for that domain, then set these **server-only Production variables in Vercel**:

- `RESEND_API_KEY`: your Resend sending key.
- `INQUIRY_NOTIFY_TO`: the private recipient list for new inquiries and pending reviews (comma-separated email addresses). It is never returned to visitors or put in the frontend.
- `INQUIRY_NOTIFY_FROM`: a verified-domain sender, for example `OneSight <inquiries@notifications.1sight.eu>` (only after verifying that domain).

Redeploy in Vercel after adding the variables. A sending address is not a purchased mailbox and does not replace your public WhatsApp contact.

Alerts contain a dashboard link and, for inquiries, a reference. Client names, email addresses, business names and project text are not sent in notification bodies. Resend processes the private recipient address to deliver the alert. Inbox delivery cannot be guaranteed by API acceptance; check spam and the Resend delivery logs during setup.

## 3. Verify before relying on it

1. Submit a clearly labelled test inquiry on the website. A receipt message appears only after Supabase confirms storage.
2. Sign in at `https://1sight.eu/admin/` using the existing owner account. Select Project inquiries. Confirm all fields are saved privately.
3. Confirm an alert arrives in the configured inbox. The dashboard distinguishes provider acceptance from failure or missing configuration. A stored inquiry remains available if mail fails; use Retry email alert after fixing delivery.
4. Mark the test contacted or archive it. Archive is reversible; this interface does not permanently delete personal data. The owner can remove inquiries in Supabase as required.
5. Check review moderation still works by switching Manage to Client reviews.

The server uses a honeypot, strict validation, same-origin checks and an atomic three-per-hour connection limit. Raw IPs are not stored in these tables. Browser retries reuse a random UUID to avoid duplicate storage. Resend requests use an idempotency key. No automatic background mail retry is configured; failed alerts are visible and retryable in the dashboard.

No new inquiry has been submitted during development, no mail has been sent, and external configuration/delivery still needs verification.

Official setup references: https://resend.com/docs/dashboard/domains/introduction and https://resend.com/docs/api-reference/emails/send-email

## Review alert tracking

Run `supabase/review-notifications.sql` once in the Supabase SQL Editor. It adds an alert status and a review submission function; it preserves existing reviews and the existing submission function. Until the migration is applied, reviews can still be submitted, but the dashboard cannot track or retry their alerts. Older reviews have no recorded alert status.

After setup, submit a clearly labeled test review and inquiry, confirm both in the private admin dashboard, and verify the alerts in each configured inbox. Leave the test review unpublished.
