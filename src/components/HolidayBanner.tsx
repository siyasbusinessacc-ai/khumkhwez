import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays } from "lucide-react";

export type Holiday = {
  id: string;
  name: string;
  kind: string;
  start_date: string;
  end_date: string;
  discount_percent: number;
  is_current: boolean;
};

const DAY = 86400000;

export const formatRange = (start: string, end: string) => {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const fmt = (d: Date, withMonth: boolean) =>
    d.toLocaleDateString("en-ZA", { day: "numeric", ...(withMonth ? { month: "short" } : {}) });
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (start === end) return fmt(s, true);
  return `${fmt(s, !sameMonth)} to ${fmt(e, true)}`;
};

export const holidayLength = (h: Holiday) =>
  Math.round(
    (new Date(h.end_date + "T00:00:00").getTime() - new Date(h.start_date + "T00:00:00").getTime()) / DAY,
  ) + 1;

/** Big amber banner telling students about holiday-reduced pricing. */
export const HolidayBanner = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc("upcoming_holidays", { _days_ahead: 45 }).then(({ data }) => {
      if (!cancelled) setHolidays((data as Holiday[]) ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const relevant = holidays.filter((h) => h.kind !== "public_holiday" || holidayLength(h) > 1);
  if (relevant.length === 0) return null;

  const main = relevant.find((h) => h.is_current) ?? relevant[0];
  const others = relevant.filter((h) => h.id !== main.id).slice(0, 2);
  const days = holidayLength(main);
  const weeks = days >= 7 ? Math.round(days / 7) : 0;

  return (
    <div className="rounded-3xl p-6 bg-primary/10 ring-1 ring-primary/40 relative overflow-hidden">
      <div className="absolute -top-20 -right-16 size-56 bg-amber-dim rounded-full blur-[80px] opacity-30" />
      <div className="relative z-10 flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 text-brass text-xs font-medium uppercase tracking-wide">
          <CalendarDays size={14} />
          {main.is_current ? "Holiday pricing active" : "Holiday pricing coming up"}
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl text-foreground leading-tight">
          {weeks > 0 ? `${weeks} week${weeks > 1 ? "s" : ""} off price` : "Days off price"} due to the holiday
          from {formatRange(main.start_date, main.end_date)}
        </h2>
        <p className="text-toast text-sm">
          {main.name} — you only pay for the days you'll actually be here. The reduced price is already
          worked into every package below.
        </p>
        {others.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {others.map((h) => (
              <span
                key={h.id}
                className="text-xs px-2.5 py-1 rounded-full bg-secondary ring-1 ring-border text-toast"
              >
                Next: {h.name} · {formatRange(h.start_date, h.end_date)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
