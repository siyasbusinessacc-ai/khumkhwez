# Branded Auth Emails for Maniac Lounge

Goal: password reset, signup verification and magic-link emails arrive reliably, from your own domain, styled like the app — instead of the current default sender that lands in spam or nowhere.

## What happens

1. **Sender domain setup** — you complete the email setup dialog with the domain you own. Lovable takes over a sending subdomain (e.g. `notify.yourdomain.com`) and manages the SPF/DKIM/MX records for it automatically. You only add the nameserver records shown to you at your registrar. Your website domain keeps working exactly as it does now.

2. **Email infrastructure** — the queue, send log, suppression list and unsubscribe handling get provisioned in your backend. No action from you.

3. **Branded auth templates** — six auth emails are created and styled to match Maniac Lounge: amber-glow primary, mahogany accents, Lora/serif headings, the Maniac Lounge logo at the top, and copy matching the app's tone ("Maniac Lounge", not "account"):
   - signup confirmation
   - password reset
   - magic link
   - invite
   - email change
   - reauthentication code

4. **Logo hosting** — the logo is uploaded to a public storage bucket so it renders in inboxes (emails can't read app assets).

5. **Deploy** — the auth email handler is deployed so the backend routes all auth emails through the branded templates.

6. **Rate limit** — the hourly auth email cap is raised from the low default to a value that fits real student signup volume, so bursts don't fail with "email rate limit exceeded".

## Timing

DNS verification can take from minutes up to 72 hours. Until it verifies, auth emails keep going out via the default sender; they switch to your branded domain automatically once verification completes. Progress is visible in Cloud → Emails.

## Not in scope

App emails (booking confirmations, offer notifications) — you chose auth emails only. These can be added later on the same domain without redoing setup.

## Technical notes

- Templates: `supabase/functions/_shared/email-templates/*.tsx` (React Email), handler `supabase/functions/auth-email-hook`.
- Styling pulled from `src/index.css` tokens; email body background stays white per email-client constraints, brand colors used on inner surfaces and CTA.
- Logo uploaded to an `email-assets` public bucket and referenced by absolute URL.
- Auth rate limit adjusted via auth config, not code.
