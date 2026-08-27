# Fix: "Choose this plan" fails with a row-level security error

## What we know so far

- The button calls the backend routine `create_pending_subscription`, which is a privileged (definer) routine and does the insert on the user's behalf.
- The `subscriptions` table has row-level security on, with rules for viewing (own rows, admins) and admin updates — but **no insert rule at all**.
- The signed-in role does hold raw insert permission on the table, so any insert that is not routed through the privileged routine hits the missing rule and fails with exactly the error you saw.

The exact failing path is not yet confirmed (the privileged routine should bypass the rules), so step 1 of this plan is to reproduce it before changing anything.

## Plan

1. **Reproduce and pin the cause**
   - Run the reservation as a real signed-in student against the live backend and capture the exact error.
   - Confirm whether the failure comes from the privileged routine or from a direct insert.

2. **Add the missing insert rule**
   - Allow a signed-in user to create a subscription row only for themselves (`user_id` must equal their own id), and only in the `pending` state.
   - This closes the gap regardless of which path performs the insert, and keeps users from creating rows for anyone else or self-activating a paid plan.

3. **Keep the privileged routine as the only sanctioned path**
   - The capacity check, payment-window check, and "already subscribed" check all live in the routine; the new rule is a safety net, not a bypass. Plan price and status stay server-decided.

4. **Verify end to end**
   - Sign in as a test student in the preview, click "Choose this plan", and confirm the bank-details (pending) card appears.
   - Confirm the reserved row shows up in the admin "Pending payments" tab with the right amount.
   - Re-run the test suite.

## Technical notes

- Migration adds: `CREATE POLICY "Users can create their own pending subscription" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending')`.
- No changes to `create_pending_subscription`, triggers, or capacity logic unless step 1 shows the routine itself is at fault.
- No frontend changes expected.
