import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type SlotRow = {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked: number;
  remaining: number;
  weekdays: number[];
};

type Booking = {
  id: string;
  slot_id: string;
  slot_label: string;
  start_time: string;
  end_time: string;
  booking_date: string;
  status: string;
};

const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const fmtT = (t: string) => t.slice(0, 5);

export const SlotBookingCard = () => {
  const { toast } = useToast();
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: s }, { data: b }] = await Promise.all([
      supabase.rpc("list_slots_for_date", { _date: date }),
      supabase.rpc("my_upcoming_bookings"),
    ]);
    setSlots((s as SlotRow[]) ?? []);
    setMyBookings((b as Booking[]) ?? []);
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const myBookingForDate = myBookings.find((x) => x.booking_date === date);

  const book = async (slotId: string) => {
    setBusy(slotId);
    const { data, error } = await supabase.rpc("book_slot", { _slot_id: slotId, _date: date });
    setBusy(null);
    if (error) return toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    const r = data as { ok: boolean; reason?: string; slot_label?: string };
    if (!r.ok) {
      const msgMap: Record<string, string> = {
        no_active_subscription: "You need an active plan to book a slot.",
        slot_full: "This slot is full. Pick another time.",
        slot_not_on_day: "Slot not available on this day.",
        invalid_slot: "Slot unavailable.",
      };
      return toast({ title: "Could not book", description: msgMap[r.reason ?? ""] ?? r.reason, variant: "destructive" });
    }
    toast({ title: "Slot reserved", description: `${r.slot_label} on ${date}` });
    load();
  };

  const cancel = async () => {
    setBusy("cancel");
    const { error } = await supabase.rpc("cancel_my_booking", { _date: date });
    setBusy(null);
    if (error) return toast({ title: "Cancel failed", description: error.message, variant: "destructive" });
    toast({ title: "Booking cancelled" });
    load();
  };

  return (
    <div className="bg-card rounded-3xl p-6 ring-1 ring-border">
      <div className="flex justify-between items-baseline gap-3 mb-4">
        <div>
          <h2 className="font-serif text-xl text-foreground">Reserve Pickup Time</h2>
          <p className="text-toast text-xs mt-0.5">Pick a slot to avoid queues at the kitchen.</p>
        </div>
        <input
          type="date"
          value={date}
          min={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="bg-input text-foreground text-sm rounded-lg px-3 py-2 ring-1 ring-border focus:ring-primary outline-none"
        />
      </div>

      {myBookingForDate && (
        <div className="mb-4 bg-primary/10 ring-1 ring-primary/30 rounded-xl p-3 flex justify-between items-center gap-3">
          <div>
            <p className="text-brass text-sm font-medium">Reserved: {myBookingForDate.slot_label}</p>
            <p className="text-toast text-xs">{fmtT(myBookingForDate.start_time)}–{fmtT(myBookingForDate.end_time)}</p>
          </div>
          <button onClick={cancel} disabled={busy === "cancel"}
            className="text-xs text-toast hover:text-destructive px-3 py-1.5 rounded-lg ring-1 ring-border">
            {busy === "cancel" ? "…" : "Cancel"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-toast text-sm text-center py-6">Loading slots…</p>
      ) : slots.length === 0 ? (
        <p className="text-toast text-sm text-center py-6">No slots scheduled for this day.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {slots.map((s) => {
            const mine = myBookingForDate?.slot_id === s.id;
            const full = s.remaining <= 0;
            return (
              <button
                key={s.id}
                onClick={() => book(s.id)}
                disabled={busy !== null || full || mine}
                className={`text-left p-3 rounded-xl ring-1 transition-colors ${
                  mine
                    ? "bg-primary/20 ring-primary/40"
                    : full
                      ? "bg-secondary/40 ring-border opacity-50 cursor-not-allowed"
                      : "bg-secondary ring-border hover:ring-primary/40"
                }`}
              >
                <div className="flex justify-between items-baseline gap-2">
                  <p className="font-medium text-foreground">{s.label}</p>
                  <p className="text-xs text-toast tabular-nums">{s.remaining}/{s.capacity}</p>
                </div>
                <p className="text-toast text-xs mt-0.5">{fmtT(s.start_time)}–{fmtT(s.end_time)}</p>
                <p className="text-xs mt-1.5">
                  {mine ? <span className="text-brass">✓ Reserved</span>
                    : full ? <span className="text-destructive">Full</span>
                    : <span className="text-toast">{s.remaining} seats left</span>}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
