# Payment Windows + Package Caps

Give admin two "set it and forget it" controls: a recurring monthly window when students may buy a plan, and a hard cap on how many students each package can hold.

## 1. Payment window (applies to everyone)

A single global setting you configure once and it repeats every month:

- Pick the days of the month the window is open, e.g. 25, 26, 27, 28, 29, 30, 31, 1.
- Pick open and close times of day (e.g. 08:00 to 22:00), Johannesburg time.
- A master switch: Enabled / Always open / Always closed (for emergencies or one-off overrides).
- Handles short months: if you select 31 and the month has 30 days, the last day of the month counts.

Student side:
- Plans stay visible but locked when the window is closed — greyed cards, a lock badge, and a line: "Payments open in 3 days (25 Sep, 08:00)" with a live countdown.
- When the window is open, a banner shows time remaining: "Payments close in 2 days".
- The lock is also enforced in the database, so a closed window cannot be bypassed.

## 2. Package caps

Per-package cap with a bulk shortcut:

- Each package (R350 / R700 / R1000) gets its own "max students" number.
- A "Set cap for all packages" field applies the same number to all three in one click.
- Caps do not auto-reset; you change them manually when you want.
- Counting mode per cap: count active subscriptions only, or count active + pending (default: active + pending, so reserved spots hold a seat).
- Optional "next month planning" field: set a planned cap for the upcoming month that you can review, then promote to live with one button.

Student side:
- Each plan card shows "18 of 50 spots left".
- Sold-out packages are disabled with a "Full" badge; other packages stay buyable.
- Admin dashboard shows a capacity bar per package (taken / cap).

## Technical notes

Database:
- New `payment_windows` table (single row): `is_enabled`, `mode` (`scheduled` | `always_open` | `always_closed`), `open_days int[]`, `open_time`, `close_time`, timezone fixed to Africa/Johannesburg. Admin-only write, readable by authenticated users.
- New columns on `meal_plans`: `capacity` (nullable int = unlimited), `count_pending` (bool), `planned_capacity` (nullable int, next-month planning).
- New function `payment_window_status()` returning `{ is_open, reason, opens_at, closes_at }` computed in Africa/Johannesburg, handling month-end clamping.
- New function `plan_availability()` returning per-plan `capacity`, `taken`, `remaining`, `sold_out`.
- New function `create_pending_subscription(_plan_id)` (security definer) that atomically re-checks the window and the cap before inserting, and returns a clear reason on failure (`window_closed`, `plan_full`, `already_subscribed`). `PlanSelector` switches from a direct table insert to this RPC; the existing user INSERT policy on `subscriptions` is tightened so purchases must go through the RPC.
- Admin-only helpers: `admin_set_payment_window(...)`, `admin_set_plan_caps(_plan_id, _capacity)` and `admin_set_all_plan_caps(_capacity)`.

Frontend:
- New `src/components/admin/AccessTab.tsx` in the Admin Dashboard: payment window editor (day chips 1-31, time pickers, mode switch) plus a caps table with per-plan inputs, a "set all" field, and live taken/remaining counts.
- `PlanSelector` in `StudentDashboard.tsx`: fetches window status and availability, renders locked/countdown/sold-out states, and calls the new RPC.
- Small shared `useWindowStatus` hook so the banner and cards stay in sync; countdown ticks every second.
