import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Trash2, Pencil } from "lucide-react";

type Holiday = {
  id: string;
  name: string;
  kind: string;
  start_date: string;
  end_date: string;
  discount_percent: number;
  is_active: boolean;
  source: string;
  notes: string | null;
};

type Quote = {
  plan_id: string;
  price_cents: number;
  discount_cents: number;
  final_cents: number;
  service_days: number;
  holiday_days: number;
};

type PlanLite = { id: string; name: string };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["M", "T", "W", "T", "F", "S", "S"];

const rand = (cents: number) =>
  `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const emptyForm = {
  id: "",
  name: "",
  kind: "recess",
  start_date: "",
  end_date: "",
  discount_percent: 100,
  is_active: true,
  notes: "",
};

// =====================================================
// Year calendar
// =====================================================
const YearCalendar = ({ year, holidays }: { year: number; holidays: Holiday[] }) => {
  const active = holidays.filter((h) => h.is_active);

  const dayInfo = (d: Date) => active.find((h) => iso(d) >= h.start_date && iso(d) <= h.end_date);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {MONTHS.map((m, mi) => {
        const first = new Date(year, mi, 1);
        const lead = (first.getDay() + 6) % 7; // Monday-first
        const daysIn = new Date(year, mi + 1, 0).getDate();
        return (
          <div key={m} className="bg-card rounded-2xl p-4 ring-1 ring-border">
            <p className="font-serif text-foreground mb-2">{m}</p>
            <div className="grid grid-cols-7 gap-1 text-center">
              {DOW.map((d, i) => (
                <span key={i} className="text-[10px] text-toast/70 uppercase">{d}</span>
              ))}
              {Array.from({ length: lead }).map((_, i) => <span key={`p${i}`} />)}
              {Array.from({ length: daysIn }).map((_, i) => {
                const date = new Date(year, mi, i + 1);
                const h = dayInfo(date);
                return (
                  <span
                    key={i}
                    title={h ? `${h.name} (−${h.discount_percent}%)` : undefined}
                    className={`text-[11px] py-1 rounded-md tabular-nums ${
                      h
                        ? h.kind === "public_holiday"
                          ? "bg-destructive/25 text-foreground ring-1 ring-destructive/40"
                          : "bg-primary/25 text-brass ring-1 ring-primary/40"
                        : "text-toast"
                    }`}
                  >
                    {i + 1}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// =====================================================
// Add / edit dialog
// =====================================================
const HolidayDialog = ({
  initial,
  trigger,
  onSaved,
}: {
  initial?: Holiday;
  trigger: React.ReactNode;
  onSaved: () => void;
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      initial
        ? {
            id: initial.id,
            name: initial.name,
            kind: initial.kind,
            start_date: initial.start_date,
            end_date: initial.end_date,
            discount_percent: initial.discount_percent,
            is_active: initial.is_active,
            notes: initial.notes ?? "",
          }
        : { ...emptyForm },
    );
  }, [open, initial]);

  const save = async () => {
    if (!form.name.trim() || !form.start_date || !form.end_date) {
      return toast({ title: "Name and both dates are required", variant: "destructive" });
    }
    if (form.end_date < form.start_date) {
      return toast({ title: "End date must be after the start date", variant: "destructive" });
    }
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      kind: form.kind,
      start_date: form.start_date,
      end_date: form.end_date,
      discount_percent: Math.max(0, Math.min(100, Number(form.discount_percent) || 0)),
      is_active: form.is_active,
      notes: form.notes.trim() || null,
      source: initial?.source ?? "manual",
    };
    const { error } = form.id
      ? await supabase.from("holiday_periods").update(payload).eq("id", form.id)
      : await supabase.from("holiday_periods").insert(payload);
    setBusy(false);
    if (error) return toast({ title: "Could not save", description: error.message, variant: "destructive" });
    toast({ title: form.id ? "Holiday updated" : "Holiday added" });
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-card ring-1 ring-border max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {initial ? "Edit holiday period" : "Add holiday period"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Winter recess"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Starts</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Ends</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recess">Recess / students away</SelectItem>
                <SelectItem value="public_holiday">Public holiday</SelectItem>
                <SelectItem value="custom">Custom closure</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Discount strength — {form.discount_percent}%</Label>
            <Input
              type="range"
              min={0}
              max={100}
              step={5}
              value={form.discount_percent}
              onChange={(e) => setForm({ ...form, discount_percent: Number(e.target.value) })}
            />
            <p className="text-toast text-xs">
              100% means students pay nothing for the serving days inside this period. Lower it to only
              partially discount those days.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-background ring-1 ring-border p-3">
            <div>
              <p className="text-foreground text-sm font-medium">Active</p>
              <p className="text-toast text-xs">Inactive periods show on the calendar but don't change prices.</p>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save holiday"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// =====================================================
// Main tab
// =====================================================
export const HolidaysTab = () => {
  const { toast } = useToast();
  const [year, setYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [plans, setPlans] = useState<PlanLite[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: h, error }, { data: q }, { data: p }] = await Promise.all([
      supabase.from("holiday_periods").select("*").order("start_date"),
      supabase.rpc("plan_holiday_quotes"),
      supabase.from("meal_plans").select("id, name").order("price_cents"),
    ]);
    if (error) toast({ title: "Could not load holidays", description: error.message, variant: "destructive" });
    setHolidays((h as Holiday[]) ?? []);
    setQuotes((q as Quote[]) ?? []);
    setPlans((p as PlanLite[]) ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (h: Holiday) => {
    const { error } = await supabase
      .from("holiday_periods")
      .update({ is_active: !h.is_active })
      .eq("id", h.id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    load();
  };

  const remove = async (h: Holiday) => {
    if (!confirm(`Delete "${h.name}"?`)) return;
    const { error } = await supabase.from("holiday_periods").delete().eq("id", h.id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Holiday removed" });
    load();
  };

  const inYear = useMemo(
    () =>
      holidays.filter(
        (h) => Number(h.start_date.slice(0, 4)) <= year && Number(h.end_date.slice(0, 4)) >= year,
      ),
    [holidays, year],
  );

  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? "Plan";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-foreground">Holiday calendar & pricing</h2>
          <p className="text-toast text-sm mt-1 max-w-xl">
            Students only pay for the days they'll be here. Any serving day inside an active holiday is
            discounted pro-rata — a week off on a 30-day plan is roughly 25% less.
          </p>
        </div>
        <HolidayDialog trigger={<Button>Add holiday</Button>} onSaved={load} />
      </div>

      {/* Live effect on today's prices */}
      <div className="bg-card rounded-2xl p-5 ring-1 ring-border">
        <p className="text-toast text-xs uppercase tracking-wide mb-3">
          What students are charged right now
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {quotes.map((q) => (
            <div key={q.plan_id} className="rounded-xl bg-background ring-1 ring-border p-3">
              <p className="text-foreground text-sm font-medium">{planName(q.plan_id)}</p>
              <p className="font-serif text-2xl text-brass tabular-nums mt-1">{rand(q.final_cents)}</p>
              {q.discount_cents > 0 ? (
                <p className="text-toast text-xs mt-1 tabular-nums">
                  <span className="line-through">{rand(q.price_cents)}</span> · {q.holiday_days} of{" "}
                  {q.service_days} serving days on holiday
                </p>
              ) : (
                <p className="text-toast text-xs mt-1">Full price — no holiday in this cycle</p>
              )}
            </div>
          ))}
          {quotes.length === 0 && <p className="text-toast text-sm">No active plans.</p>}
        </div>
      </div>

      {/* Year calendar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setYear((y) => y - 1)}>
          <ChevronLeft size={16} /> {year - 1}
        </Button>
        <p className="font-serif text-xl text-foreground tabular-nums">{year}</p>
        <Button variant="ghost" size="sm" onClick={() => setYear((y) => y + 1)}>
          {year + 1} <ChevronRight size={16} />
        </Button>
      </div>
      <YearCalendar year={year} holidays={inYear} />
      <div className="flex gap-4 text-xs text-toast">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-primary/25 ring-1 ring-primary/40" /> Recess / closure
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-destructive/25 ring-1 ring-destructive/40" /> Public holiday
        </span>
      </div>

      {/* List */}
      <div className="grid gap-3">
        {loading && <p className="text-toast text-sm">Loading…</p>}
        {holidays.map((h) => (
          <div key={h.id} className="bg-card rounded-2xl p-4 ring-1 ring-border flex flex-wrap gap-3 justify-between items-center">
            <div className="min-w-0">
              <p className="text-foreground font-medium truncate">
                {h.name}{" "}
                <span className="text-toast text-xs">
                  · {h.kind === "public_holiday" ? "public holiday" : h.kind}
                </span>
              </p>
              <p className="text-toast text-xs mt-0.5 tabular-nums">
                {h.start_date} → {h.end_date} · −{h.discount_percent}% on serving days
              </p>
              {h.notes && <p className="text-toast text-xs mt-0.5 italic">{h.notes}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={h.is_active} onCheckedChange={() => toggle(h)} aria-label="Active" />
              <HolidayDialog
                initial={h}
                onSaved={load}
                trigger={
                  <Button size="sm" variant="secondary">
                    <Pencil size={14} />
                  </Button>
                }
              />
              <Button size="sm" variant="ghost" onClick={() => remove(h)}>
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ))}
        {!loading && holidays.length === 0 && (
          <p className="text-toast text-center py-10">No holiday periods yet.</p>
        )}
      </div>
    </div>
  );
};
