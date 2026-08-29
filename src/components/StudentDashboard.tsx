import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { Sidebar } from "@/components/Sidebar";
import { SlotBookingCard } from "@/components/SlotBookingCard";
import { WeeklyMenuView } from "@/components/WeeklyMenuView";
import { Lock, Copy, MessageCircle } from "lucide-react";
import {
  usePaymentAccess,
  msUntil,
  formatCountdown,
  formatLocalDateTime,
} from "@/hooks/usePaymentAccess";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type MealPlan = Tables<"meal_plans">;

type HolidayQuote = {
  plan_id: string;
  price_cents: number;
  discount_cents: number;
  final_cents: number;
  service_days: number;
  holiday_days: number;
};

type ActiveSub = {
  id: string;
  status: string;
  end_date: string | null;
  start_date: string | null;
  plan: {
    name: string;
    code: string;
    allowed_weekdays: number[];
    duration_days: number;
    price_cents: number;
  } | null;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const formatRand = (cents: number) =>
  `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const isoWeekdayToday = () => ((new Date().getDay() + 6) % 7) + 1; // 1=Mon..7=Sun

const daysBetween = (end: string) => {
  const e = new Date(end + "T00:00:00");
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((e.getTime() - t.getTime()) / 86400000));
};

// =====================================================
// Active pass card — shows real subscription + QR
// =====================================================
const ActivePassCard = ({
  qrCodePass,
  sub,
  redeemedToday,
}: {
  qrCodePass: string;
  sub: ActiveSub;
  redeemedToday: boolean;
}) => {
  const today = isoWeekdayToday();
  const planCoversToday = sub.plan?.allowed_weekdays.includes(today) ?? false;
  const daysLeft = sub.end_date ? daysBetween(sub.end_date) : null;

  const status = redeemedToday
    ? { label: "Served Today", tone: "served" }
    : planCoversToday
      ? { label: "Eligible Today", tone: "eligible" }
      : { label: "Plan Off Today", tone: "off" };

  return (
    <div className="bg-card rounded-3xl p-6 sm:p-8 ring-1 ring-border shadow-[0_0_60px_-15px_hsl(var(--amber-glow)/0.15)] relative overflow-hidden">
      <div className="absolute -top-24 -right-24 size-64 bg-amber-dim rounded-full blur-[80px] opacity-30 animate-pulse-glow" />
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex justify-between items-start gap-3">
          <div>
            <p className="text-toast text-sm font-medium mb-1">Your Plan</p>
            <h2 className="font-serif text-3xl text-foreground leading-tight">
              {sub.plan?.name ?? "Active"}
            </h2>
            {daysLeft !== null && (
              <p className="text-toast text-sm mt-1">
                {daysLeft} {daysLeft === 1 ? "day" : "days"} remaining
              </p>
            )}
          </div>
          <div
            className={`px-3 py-1 rounded-full ring-1 text-xs font-medium uppercase tracking-wide ${
              status.tone === "eligible"
                ? "bg-secondary text-brass ring-primary/40"
                : status.tone === "served"
                  ? "bg-destructive/20 text-destructive-foreground ring-destructive/40"
                  : "bg-secondary text-toast ring-border"
            }`}
          >
            {status.label}
          </div>
        </div>

        {/* Plan day badges */}
        {sub.plan && (
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_LABELS.map((d, i) => {
              const active = sub.plan!.allowed_weekdays.includes(i + 1);
              const isToday = i + 1 === today;
              return (
                <span
                  key={d}
                  className={`px-2.5 py-1 rounded-full text-xs ring-1 transition-colors ${
                    active
                      ? isToday
                        ? "bg-primary text-primary-foreground ring-primary"
                        : "bg-secondary text-foreground ring-border"
                      : "bg-background text-toast/50 ring-border"
                  }`}
                >
                  {d}
                </span>
              );
            })}
          </div>
        )}

        {/* QR Code */}
        <div className="bg-background rounded-2xl p-6 ring-1 ring-border flex flex-col items-center justify-center gap-4">
          <div className="bg-parchment p-3 rounded-xl">
            <QRCodeSVG value={qrCodePass} size={160} bgColor="#F5EBD9" fgColor="#0a0807" level="M" />
          </div>
          <p className="text-toast text-sm text-center max-w-[26ch]">
            {redeemedToday
              ? "You've already claimed today's meal. See you tomorrow!"
              : planCoversToday
                ? "Show this code at the kitchen to claim today's meal"
                : "Your plan doesn't cover today. Come back on a covered day."}
          </p>
        </div>
      </div>
    </div>
  );
};

// =====================================================
// Pending pass — payment in progress / awaiting activation
// =====================================================
type PendingSub = { id: string; planName: string; amount_cents: number };

const BANK_NAME = "FNB";
const ACCOUNT_NUMBER = "63183622951";
const WHATSAPP_NUMBER = "27845734958";

const PendingPassCard = ({ pending, userEmail, onApplied }: { pending: PendingSub; userEmail: string; onApplied: () => void }) => {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [proofSent, setProofSent] = useState(false);

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(ACCOUNT_NUMBER);
      toast({ title: "Account number copied" });
    } catch {
      toast({ title: "Copy failed", description: ACCOUNT_NUMBER, variant: "destructive" });
    }
  };

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi! I've completed the EFT payment for my Maniac Lounge ${pending.planName} plan (R${(pending.amount_cents / 100).toFixed(2)}). My email is ${userEmail} and I used it as the payment reference. Attached is my proof of payment.`,
  )}`;

  const applyOffer = async () => {
    if (!code.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("redeem_offer_code", { _code: code.trim(), _subscription_id: pending.id });
    setBusy(false);
    if (error) return toast({ title: "Could not apply", description: error.message, variant: "destructive" });
    const r = data as { ok: boolean; reason?: string; applied_cents?: number; offer_name?: string };
    if (!r.ok) return toast({ title: "Code rejected", description: r.reason ?? "Invalid", variant: "destructive" });
    toast({ title: `${r.offer_name} applied`, description: `−R${((r.applied_cents ?? 0) / 100).toFixed(2)}` });
    setCode("");
    onApplied();
  };

  const useWallet = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("apply_wallet_credit_to_subscription", { _subscription_id: pending.id });
    setBusy(false);
    if (error) return toast({ title: "Could not apply", description: error.message, variant: "destructive" });
    const r = data as { ok: boolean; applied_cents?: number };
    toast({ title: r.applied_cents ? `Wallet −R${((r.applied_cents) / 100).toFixed(2)}` : "Nothing to apply" });
    onApplied();
  };

  return (
    <div className="bg-card rounded-3xl p-6 sm:p-8 ring-1 ring-border">
      <div className="text-center">
        <p className="text-toast text-xs font-medium uppercase tracking-wide mb-2">Awaiting Payment</p>
        <h2 className="font-serif text-2xl text-foreground">{pending.planName}</h2>
        <p className="font-serif text-3xl text-brass mt-2">R{(pending.amount_cents / 100).toFixed(2)}</p>
        <p className="text-toast text-sm mt-3 max-w-md mx-auto">
          Pay by manual EFT bank transfer using the details below.
        </p>
      </div>

      {/* Bank details */}
      <div className="mt-5 bg-background rounded-2xl ring-1 ring-border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-toast text-sm">Bank</span>
          <span className="text-foreground font-medium">{BANK_NAME}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-toast text-sm">Account Number</span>
          <div className="flex items-center gap-2">
            <span className="text-foreground font-mono tabular-nums">{ACCOUNT_NUMBER}</span>
            <button
              onClick={copyAccount}
              aria-label="Copy Account Number"
              className="px-3 py-1.5 rounded-lg bg-secondary ring-1 ring-border text-foreground hover:ring-primary/40 text-xs flex items-center gap-1.5"
            >
              <Copy size={13} /> Copy
            </button>
          </div>
        </div>
      </div>

      {/* Proof mandate */}
      <div className="mt-4 rounded-2xl p-4 bg-destructive/15 ring-1 ring-destructive/40">
        <p className="text-foreground font-bold text-sm leading-relaxed">
          IMPORTANT: After paying, send your proof of payment on WhatsApp so we can verify and activate your pass.
        </p>
      </div>

      {/* WhatsApp proof */}
      {proofSent ? (
        <div className="mt-4 rounded-2xl p-4 bg-primary/10 ring-1 ring-primary/30 text-center">
          <p className="text-brass font-medium">Proof sent — verification pending</p>
          <p className="text-toast text-sm mt-1">
            Your membership access is pending quick manual verification. We'll activate your pass shortly after we confirm the payment.
          </p>
        </div>
      ) : (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setProofSent(true)}
          className="mt-4 w-full py-3.5 rounded-xl bg-[#25D366] text-[#04220f] font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <MessageCircle size={18} /> I've Paid — Send Proof on WhatsApp
        </a>
      )}

      <div className="mt-5 pt-5 border-t border-border space-y-3">
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="OFFER CODE"
            className="flex-1 bg-input text-foreground rounded-xl px-4 py-3 ring-1 ring-border focus:ring-primary outline-none font-mono text-sm"
          />
          <button onClick={applyOffer} disabled={busy || !code.trim()}
            className="px-4 py-3 rounded-xl bg-secondary ring-1 ring-border text-foreground hover:ring-primary/40 disabled:opacity-50 text-sm">
            Apply
          </button>
        </div>
        <button onClick={useWallet} disabled={busy}
          className="w-full py-3 rounded-xl bg-primary/10 ring-1 ring-primary/30 text-brass hover:bg-primary/20 disabled:opacity-50 text-sm">
          Use referral wallet credit
        </button>
      </div>
    </div>
  );
};


// =====================================================
// Plan selector — payment-ready stub
// =====================================================
const PlanSelector = ({
  plans,
  userId,
  onCreated,
}: {
  plans: MealPlan[];
  userId: string;
  onCreated: () => void;
}) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const { status, availabilityFor, reload, nowLocal } = usePaymentAccess();
  const [quotes, setQuotes] = useState<HolidayQuote[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc("plan_holiday_quotes").then(({ data }) => {
      if (!cancelled) setQuotes((data as HolidayQuote[]) ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const quoteFor = (planId: string) => quotes.find((q) => q.plan_id === planId) ?? null;

  const windowOpen = status?.is_open !== false;
  const opensIn = msUntil(status?.opens_at ?? null, nowLocal);
  const closesIn = msUntil(status?.closes_at ?? null, nowLocal);

  const choosePlan = async (plan: MealPlan) => {
    setBusy(plan.id);
    try {
      const { data, error } = await supabase.rpc("create_pending_subscription", { _plan_id: plan.id });
      if (error) throw error;
      const r = data as { ok: boolean; reason?: string };
      if (!r?.ok) {
        const map: Record<string, string> = {
          window_closed: "Payments are currently closed. Come back when the window opens.",
          plan_full: "This package is full. Try another package.",
          already_subscribed: "You already have a plan reserved or active.",
          invalid_plan: "That plan is unavailable.",
        };
        reload();
        return toast({
          title: "Could not reserve plan",
          description: map[r?.reason ?? ""] ?? r?.reason,
          variant: "destructive",
        });
      }
      toast({
        title: "Plan reserved",
        description: "Pay at the counter or wait for online payment to be enabled. Admin can activate manually.",
      });
      reload();
      onCreated();
    } catch (e: any) {
      toast({ title: "Could not reserve plan", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div id="packages" className="flex flex-col gap-4">
      <div>
        <h2 className="font-serif text-2xl text-foreground">Choose Your Plan</h2>
        <p className="text-toast text-sm mt-1">All plans run for 30 days from activation.</p>
      </div>

      {status && !windowOpen && (
        <div className="bg-card ring-1 ring-border rounded-2xl p-4 flex items-start gap-3">
          <Lock size={18} className="text-brass mt-0.5 shrink-0" />
          <div>
            <p className="text-foreground font-medium">Payments are closed right now</p>
            <p className="text-toast text-sm mt-0.5">
              {status.opens_at
                ? `Opens ${formatLocalDateTime(status.opens_at)} · in ${formatCountdown(opensIn ?? 0)}`
                : "Purchases are paused. Check back soon."}
            </p>
          </div>
        </div>
      )}

      {status && windowOpen && status.closes_at && (
        <div className="bg-primary/10 ring-1 ring-primary/30 rounded-2xl p-3">
          <p className="text-brass text-sm">
            Payments are open — closes in {formatCountdown(closesIn ?? 0)} ({formatLocalDateTime(status.closes_at)})
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {plans
          .filter((p) => p.is_active)
          .map((plan) => {
            const isBest = plan.code === "full_week";
            const avail = availabilityFor(plan.id);
            const soldOut = avail?.sold_out ?? false;
            const locked = !windowOpen || soldOut;
            const quote = quoteFor(plan.id);
            const holidayOff = (quote?.discount_cents ?? 0) > 0;
            return (
              <div
                key={plan.id}
                className={`bg-card rounded-2xl p-5 ring-1 transition-opacity ${
                  isBest ? "ring-primary/40 shadow-[0_0_40px_-15px_hsl(var(--amber-glow)/0.3)]" : "ring-border"
                } ${locked ? "opacity-60" : ""}`}
              >
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-serif text-xl text-foreground">{plan.name}</h3>
                      {isBest && (
                        <span className="text-[10px] uppercase tracking-wider text-brass bg-secondary px-2 py-0.5 rounded-full ring-1 ring-primary/40">
                          Best Value
                        </span>
                      )}
                      {soldOut && (
                        <span className="text-[10px] uppercase tracking-wider text-destructive bg-secondary px-2 py-0.5 rounded-full ring-1 ring-destructive/40">
                          Full
                        </span>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-toast text-sm mt-1">{plan.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-serif text-2xl text-brass tabular-nums">
                      {formatRand(holidayOff ? quote!.final_cents : plan.price_cents)}
                    </p>
                    {holidayOff ? (
                      <p className="text-toast text-xs tabular-nums">
                        <span className="line-through">{formatRand(plan.price_cents)}</span> holiday price
                      </p>
                    ) : (
                      <p className="text-toast text-xs">/ {plan.duration_days} days</p>
                    )}
                  </div>
                </div>

                {avail?.capacity != null && (
                  <p className="text-toast text-xs mb-3 tabular-nums">
                    {soldOut ? "No spots left" : `${avail.remaining} of ${avail.capacity} spots left`}
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {WEEKDAY_LABELS.map((d, i) => {
                    const on = plan.allowed_weekdays.includes(i + 1);
                    return (
                      <span
                        key={d}
                        className={`px-2 py-0.5 rounded-full text-xs ring-1 ${
                          on
                            ? "bg-secondary text-foreground ring-border"
                            : "bg-background text-toast/40 ring-border"
                        }`}
                      >
                        {d}
                      </span>
                    );
                  })}
                </div>
                <button
                  onClick={() => choosePlan(plan)}
                  disabled={busy !== null || locked}
                  className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {locked && <Lock size={15} />}
                  {soldOut
                    ? "Package full"
                    : !windowOpen
                      ? `Opens in ${formatCountdown(opensIn ?? 0)}`
                      : busy === plan.id
                        ? "Reserving…"
                        : "Choose this plan"}
                </button>
              </div>
            );
          })}
      </div>
      <p className="text-toast text-xs text-center px-4">
        Pay by manual EFT (FNB) after reserving — send proof on WhatsApp and we activate your pass.
      </p>
    </div>
  );
};


// MenuPreview replaced by WeeklyMenuView (admin-managed weekly menu)

// =====================================================
// Main
// =====================================================
// Wallet + tier UI lives in the Referral tab (src/pages/ReferralPage.tsx)

const StudentDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeSub, setActiveSub] = useState<ActiveSub | null>(null);
  const [pendingSub, setPendingSub] = useState<PendingSub | null>(null);
  const [redeemedToday, setRedeemedToday] = useState(false);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loadingSub, setLoadingSub] = useState(true);
  // wallet/tier removed from student dashboard — see Referral tab

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoadingSub(true);

    const [{ data: prof }, { data: subs }, { data: planRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("subscriptions")
        .select("id, status, end_date, start_date, amount_cents, meal_plans(name, code, allowed_weekdays, duration_days, price_cents)")
        .eq("user_id", user.id)
        .in("status", ["active", "pending"])
        .order("created_at", { ascending: false }),
      supabase.from("meal_plans").select("*").eq("is_active", true).order("price_cents"),
    ]);

    if (prof) setProfile(prof as Profile);
    setPlans((planRows as MealPlan[]) ?? []);

    const subList = (subs as any[]) ?? [];
    const active = subList.find((s) => s.status === "active");
    const pending = subList.find((s) => s.status === "pending");

    if (active) {
      setActiveSub({
        id: active.id,
        status: active.status,
        end_date: active.end_date,
        start_date: active.start_date,
        plan: active.meal_plans
          ? {
              name: active.meal_plans.name,
              code: active.meal_plans.code,
              allowed_weekdays: active.meal_plans.allowed_weekdays,
              duration_days: active.meal_plans.duration_days,
              price_cents: active.meal_plans.price_cents,
            }
          : null,
      });

      const today = new Date().toISOString().slice(0, 10);
      const { data: red } = await supabase
        .from("meal_redemptions")
        .select("id")
        .eq("subscription_id", active.id)
        .eq("redeemed_on", today)
        .maybeSingle();
      setRedeemedToday(!!red);
    } else {
      setActiveSub(null);
      setRedeemedToday(false);
    }

    setPendingSub(pending ? { id: pending.id, planName: pending.meal_plans?.name ?? "Plan", amount_cents: pending.amount_cents } : null);

    // wallet/tier moved to Referral tab

    setLoadingSub(false);
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const initials = profile
    ? `${(profile.name?.[0] || "").toUpperCase()}${(profile.surname?.[0] || "").toUpperCase()}` || "?"
    : "?";

  const greeting =
    new Date().getHours() < 12 ? "Good Morning" : new Date().getHours() < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="min-h-dvh bg-background pb-12">
      <Sidebar />
      <header className="px-5 pt-8 pb-4 relative flex flex-col items-center gap-4">
        <Logo size={120} />
        <div className="text-center">
          <p className="text-toast text-sm font-medium tracking-wide uppercase mb-1">
            {greeting}
            {profile?.name ? `, ${profile.name}` : ""}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-foreground leading-tight">
            Maniac Lounge App Now
          </h1>
        </div>
        <span className="sr-only" data-testid="user-initials">{initials}</span>
      </header>

      <main className="px-5 flex flex-col gap-8 mt-2 max-w-2xl mx-auto">
        {loadingSub ? (
          <div className="bg-card rounded-3xl p-8 ring-1 ring-border text-center">
            <p className="text-toast text-sm">Loading your pass…</p>
          </div>
        ) : activeSub ? (
          <ActivePassCard 
            qrCodePass={profile?.qr_code_pass || user!.id} 
            sub={activeSub} 
            redeemedToday={redeemedToday} 
          />
        ) : pendingSub ? (
          <PendingPassCard pending={pendingSub} userEmail={user?.email ?? ""} onApplied={loadAll} />
        ) : (

          <PlanSelector plans={plans} userId={user!.id} onCreated={loadAll} />
        )}
        {activeSub && <SlotBookingCard />}
        <WeeklyMenuView />
      </main>
    </div>
  );
};

export default StudentDashboard;
