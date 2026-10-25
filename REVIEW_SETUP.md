# Review system activation

The source is complete, but submissions remain disabled until a working Supabase project and environment variables are configured. There is no WhatsApp handoff. The separate project inquiry form is still a preview.

1. Create/select a Supabase project in your own account, choosing an EU region if appropriate. Review the current plan limits and costs before provisioning. No paid service is required by the code itself, but Supabase and Vercel usage is subject to their plans.
2. Run `supabase/reviews.sql` once in the Supabase SQL Editor. It creates the tables, rate-limit function and restricted permissions. It will fail if the tables already exist; do not reset an existing database.
3. In Supabase Authentication, disable public signups for this project. Create your owner user in the dashboard and set its credentials yourself. Copy that user's UUID. Do not put passwords in GitHub.
4. Add these variables to the OneSight Vercel project, for Production and any preview environments that need reviews:
   - `SUPABASE_URL`: your HTTPS project URL.
   - `SUPABASE_ANON_KEY`: the public anon/publishable key used for owner sign-in.
   - `SUPABASE_SERVICE_ROLE_KEY`: the server-only service-role JWT key. Never put it in a file under `dist`, GitHub, or a chat message.
   - `REVIEW_ADMIN_ID`: the UUID of the single permitted owner user.
   - `REVIEW_RATE_SALT`: a random secret, at least 32 bytes, used to hash connection addresses.
5. Redeploy the latest GitHub commit in Vercel so the functions receive these variables.
6. Visit `/admin/`, sign in, and verify that pending reviews can be approved and rejected. Credentials go directly to your Supabase Auth endpoint. Access tokens are kept only in page memory and are verified server-side on each moderation request. Reloading requires another login.
7. Submit a clearly labelled test review through the homepage. Verify it is absent publicly, appears under Pending, appears publicly after Approve and disappears after Reject / unpublish. Remove the test record using your Supabase dashboard after verification.
8. Confirm privacy/retention practices before opening submissions. Delete unwanted reviews in the Supabase dashboard; rejected reviews otherwise remain private until you remove them. No automatic review retention deadline is imposed by this code. Rate-limit records older than an hour are cleared on the next submission. Provider logs have their own retention settings.

## Moderation

Open `https://1sight.eu/admin/`. Choose Pending, Approved or Rejected. Approve publishes the original feedback, Reject unpublishes it, and Return to pending removes it from public display. Changes appear on the next homepage load. Requests fetch fresh data rather than caching reviews. The admin page HTML is publicly reachable, but all review data and mutations require the configured owner's verified access token; a hidden URL is not the security control.

## Abuse protection and limits

The server checks field lengths, consent, content type, request size and browser origin. A hidden honeypot and a database-backed limit of three submissions per connection per hour reduce routine spam. This is basic protection, not a CAPTCHA or a guarantee against distributed abuse. Shared connections share the limit. Monitor use and add a verified challenge provider if needed.

## Hosting

Vercel serves `dist` and runs `api/reviews.js` as a Node function. This adds backend functionality without changing the buildless frontend. Never host only `dist` and expect reviews to work: the API function and configured Supabase database are also required. The original Sites preview does not automatically receive this GitHub deployment.

## Validation

Run `node --test tests/reviews.test.cjs`. These mocked API checks cover unconfigured service behavior, private moderation, public filtering, validation, successful pending submission, rate limiting, and failed storage. Live database permissions, delivery and approval still require the activation checks above.
