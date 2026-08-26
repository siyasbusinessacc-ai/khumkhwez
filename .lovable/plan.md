# Fix Auth Email Sending

Goal: make password reset, signup verification, and other auth emails send reliably from `notify.maniaclounge.co.za`.

## Confirmed status

- The sender domain `notify.maniaclounge.co.za` is verified.
- Project auth emails are enabled.
- The auth email handler is receiving password-reset events, but fails before sending because the email queue backend function it calls is missing from the active backend schema.

## Plan

1. **Repair email infrastructure**
   - Re-run the email infrastructure setup for this project.
   - This restores the email queue, send log, retry processing, and the missing queue function used by auth emails.

2. **Redeploy the auth email handler**
   - Deploy the current auth email handler again so the latest branded templates and queue integration are active.

3. **Verify the setup status**
   - Re-check the email status after setup/deploy.
   - Confirm the domain remains verified and that the project email setup is complete.

4. **Trigger a real auth email test**
   - Send a fresh password-reset email from the app.
   - Check whether it is accepted into the email system instead of failing at the queue step.

5. **If the email still does not arrive**
   - Check recent email logs for the exact final status: sent, failed, suppressed, or dead-lettered.
   - If it is marked sent but not visible, check Spam/Promotions and test with another recipient address.

## Not changing

- No DNS changes are needed because the sender domain is already verified.
- No app UI changes are needed for this fix.
- No third-party email provider is needed.

## Technical notes

- The current failure shown in the logs is: missing `public.enqueue_email(payload, queue_name)`.
- The auth email handler already uses the queue-based flow, so the likely repair is infrastructure setup plus redeploy, not rewriting templates.
