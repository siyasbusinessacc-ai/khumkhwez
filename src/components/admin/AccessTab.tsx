import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  usePaymentAccess,
  formatLocalDateTime,
} from "@/hooks/usePaymentAccess";
import type { Tables } from "@/integrations/supabase/types";

type MealPlan = Tables<"meal_plans">;

type WindowRow = {
  is_enabled: boolean;
  mode: "scheduled" | "always_open" | "always_closed";
  open_days: number[];
  open_time: string;
  close_time: string;
};

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const MODES: { value: WindowRow["mode"]; label: string }[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "always_open", label: "Always open" },
  { value: "always_closed", label: "Always closed" },
];

export const AccessTab = () => {
  const { toast } = useToast();
  const { status, availabilityFor, reload } = usePaymentAccess();
  const [win, setWin] = useState<WindowRow | null>(null);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: w }, { data: p }] = await Promise.all([
      supabase.from("payment_windows").select("*").maybeSingle(),
      supabase.from("meal_plans").select("*").order("price_cents"),
    ]);
    if (w) {
      setWin({
        is_enabled: w.is_enabled,
        mode: w.mode as WindowRow["mode"],
        open_days: w.open_days ?? [],
        open_time: (w.open_time as string).slice(0, 5),
        close_time: (w.close_time as string).slice(0, 5),
      });
    }
    setPlans((p as MealPlan[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const saveWindow = async () => {
    if (!win) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_set_payment_window", {
      _is_enabled: win.is_enabled,
      _mode: win.mode,
      _open_days: win.open_days,
      _open_time: win.open_time,
      _close_time: win.close_time,
    });
    setBusy(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Payment window saved" });
    reload();
  };

  const savePlan = async (plan: MealPlan, capacity: string, countPending: boolean, planned: string) => {
    const { error } = await supabase.rpc("admin_set_plan_cap", {
      _plan_id: plan.id,
      _capacity: capacity === "" ? null : Number(capacity),
      _count_pending: countPending,
      _planned_capacity: planned === "" ? null : Number(planned),
    });
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: `${plan.name} cap saved` });
    load();
    reload();
  };

  const applyToAll = async () => {
    const { error } = await supabase.rpc("admin_set_all_plan_caps", {
      _capacity: bulk === "" ? null : Number(bulk),
      _planned: false,
    });
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Cap applied to all packages" });
    setBulk("");
    load();
    reload();
  };

  const promotePlanned = async () => {
    const { error } = await supabase.rpc("admin_promote_planned_caps");
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Next-month caps are now live" });
    load();
    reload();
  };

  const toggleDay = (d: number) => {
    if (!win) return;
    setWin({
      ...win,
      open_days: win.open_days.includes(d)
        ? win.open_days.filter((x) => x !== d)
        : [...win.open_days, d].sort((a, b) => a - b),
    });
  };

  return (
    <div className="space-y-6">
      {/* Payment window */}
      <section className="bg-card rounded-2xl p-5 ring-1 ring-border space-y-4">
        <div className="flex justify-between items-start gap-3 flex-wrap">
          <div>
            <h2 className="font-serif text-xl text-foreground">Payment Window</h2>
            <p className="text-toast text-sm mt-0.5">
              Set once — repeats every month (Johannesburg time).
            </p>
          </div>
          {status && (
            <div className="text-right">
              <p className={`text-sm font-medium ${status.is_open ? "text-brass" : "text-destructive"}`}>
                {status.is_open ? "Open now" : "Closed now"}
              </p>
              <p className="text-toast text-xs">
                {status.is_open
                  ? status.closes_at ? `Closes ${formatLocalDateTime(status.closes_at)}` : "No end"
                  : status.opens_at ? `Opens ${formatLocalDateTime(status.opens_at)}` : "Paused"}
              </p>
            </div>
          )}
        </div>

        {win && (
          <>
            <div className="flex items-center gap-3">
              <Switch checked={win.is_enabled} onCheckedChange={(v) => setWin({ ...win, is_enabled: v })} />
              <span className="text-sm text-foreground">Enforce the window</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setWin({ ...win, mode: m.value })}
                  className={`text-xs px-3 py-1.5 rounded-full ring-1 ${
                    win.mode === m.value
                      ? "bg-primary/20 text-brass ring-primary/40"
                      : "bg-secondary text-toast ring-border"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div>
              <Label>Open on these days of the month</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {DAYS.map((d) => {
                  const on = win.open_days.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={`w-9 h-9 text-xs rounded-lg ring-1 tabular-nums ${
                        on ? "bg-primary/20 text-brass ring-primary/40" : "bg-secondary text-toast ring-border"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
              <p className="text-toast text-xs mt-2">
                Day 31 automatically falls back to the last day in shorter months.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <div>
                <Label>Opens at</Label>
                <Input type="time" value={win.open_time} onChange={(e) => setWin({ ...win, open_time: e.target.value })} />
              </div>
              <div>
                <Label>Closes at</Label>
                <Input type="time" value={win.close_time} onChange={(e) => setWin({ ...win, close_time: e.target.value })} />
              </div>
            </div>

            <Button onClick={saveWindow} disabled={busy}>{busy ? "Saving…" : "Save window"}</Button>
          </>
        )}
      </section>

      {/* Caps */}
      <section className="bg-card rounded-2xl p-5 ring-1 ring-border space-y-4">
        <div>
          <h2 className="font-serif text-xl text-foreground">Package Caps</h2>
          <p className="text-toast text-sm mt-0.5">Limit how many students each package can hold. Blank = unlimited.</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Set the same cap for all packages</Label>
            <Input
              type="number"
              min={0}
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              placeholder="50"
              className="w-32"
            />
          </div>
          <Button onClick={applyToAll} variant="secondary">Apply to all</Button>
          <Button onClick={promotePlanned} variant="secondary">Promote next-month caps</Button>
        </div>

        <div className="space-y-3">
          {plans.map((plan) => (
            <PlanCapRow key={plan.id} plan={plan} avail={availabilityFor(plan.id)} onSave={savePlan} />
          ))}
          {plans.length === 0 && <p className="text-toast text-center py-6">No packages configured.</p>}
        </div>
      </section>
    </div>
  );
};

const PlanCapRow = ({
  plan,
  avail,
  onSave,
}: {
  plan: MealPlan;
  avail: { capacity: number | null; taken: number; remaining: number | null; sold_out: boolean } | null;
  onSave: (p: MealPlan, cap: string, countPending: boolean, planned: string) => void;
}) => {
  const [cap, setCap] = useState(plan.capacity?.toString() ?? "");
  const [planned, setPlanned] = useState(plan.planned_capacity?.toString() ?? "");
  const [countPending, setCountPending] = useState(plan.count_pending);

  useEffect(() => {
    setCap(plan.capacity?.toString() ?? "");
    setPlanned(plan.planned_capacity?.toString() ?? "");
    setCountPending(plan.count_pending);
  }, [plan]);

  const taken = avail?.taken ?? 0;
  const capNum = plan.capacity;
  const pct = capNum ? Math.min(100, Math.round((taken / capNum) * 100)) : 0;

  return (
    <div className="bg-secondary/40 rounded-xl p-4 ring-1 ring-border space-y-3">
      <div className="flex justify-between items-baseline gap-3 flex-wrap">
        <p className="font-serif text-lg text-foreground">{plan.name}</p>
        <p className="text-toast text-sm tabular-nums">
          {capNum ? `${taken} / ${capNum} taken` : `${taken} taken · unlimited`}
        </p>
      </div>

      {capNum != null && (
        <div className="h-2 rounded-full bg-background overflow-hidden ring-1 ring-border">
          <div
            className={`h-full ${pct >= 100 ? "bg-destructive" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Cap (live)</Label>
          <Input type="number" min={0} value={cap} onChange={(e) => setCap(e.target.value)} placeholder="Unlimited" />
        </div>
        <div>
          <Label className="text-xs">Planned cap (next month)</Label>
          <Input type="number" min={0} value={planned} onChange={(e) => setPlanned(e.target.value)} placeholder="—" />
        </div>
        <div className="flex items-end gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={countPending} onCheckedChange={setCountPending} />
            <span className="text-xs text-toast">Count reserved</span>
          </div>
          <Button size="sm" onClick={() => onSave(plan, cap, countPending, planned)}>Save</Button>
        </div>
      </div>
    </div>
  );
};
