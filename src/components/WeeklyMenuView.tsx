import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type MenuItem = {
  id: string;
  menu_date: string;
  title: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const weekStart = (d: Date) => {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // days since Monday
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
};

const isoLocal = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export const WeeklyMenuView = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const start = weekStart(today);
  const todayKey = isoLocal(today);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("menu_for_week", { _week_start: isoLocal(start) });
      setItems((data as MenuItem[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const todays = items.filter((it) => it.menu_date === todayKey);

  return (
    <div id="menu" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-xl text-foreground">This Week's Menu</h2>
        <span className="text-toast text-xs uppercase tracking-wide">From the kitchen</span>
      </div>

      {/* Today's highlight */}
      {todays.length > 0 && (
        <div className="bg-card rounded-3xl p-5 ring-1 ring-primary/30 shadow-[0_0_50px_-20px_hsl(var(--amber-glow)/0.3)]">
          <p className="text-brass text-xs uppercase tracking-wider mb-2">Today</p>
          <div className="flex flex-col gap-3">
            {todays.map((it) => (
              <div key={it.id} className="flex gap-4 items-start">
                {it.image_url && (
                  <img src={it.image_url} alt={it.title} loading="lazy"
                    className="size-24 rounded-xl object-cover ring-1 ring-border shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-lg text-foreground">{it.title}</h3>
                  {it.description && <p className="text-toast text-sm mt-1">{it.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week strip */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const key = isoLocal(d);
          const dayItems = items.filter((it) => it.menu_date === key);
          const isToday = key === todayKey;
          return (
            <div key={key}
              className={`rounded-xl p-2 text-center ring-1 ${
                isToday ? "bg-primary/15 ring-primary/40" : "bg-card ring-border"
              }`}>
              <p className="text-toast text-[10px] uppercase">{DAY_LABELS[d.getDay()]}</p>
              <p className="text-foreground text-sm font-medium tabular-nums">{d.getDate()}</p>
              <p className="text-brass text-[10px] mt-1">
                {dayItems.length > 0 ? `${dayItems.length} dish${dayItems.length > 1 ? "es" : ""}` : "—"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Other days */}
      <div className="space-y-2">
        {days.filter(d => isoLocal(d) !== todayKey).map((d) => {
          const key = isoLocal(d);
          const dayItems = items.filter((it) => it.menu_date === key);
          if (dayItems.length === 0) return null;
          return (
            <div key={key} className="bg-card/50 rounded-2xl p-3 ring-1 ring-border">
              <p className="text-toast text-xs uppercase tracking-wider mb-2">
                {DAY_LABELS[d.getDay()]} · {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </p>
              <div className="flex flex-col gap-2">
                {dayItems.map((it) => (
                  <div key={it.id} className="flex gap-3 items-center">
                    {it.image_url && (
                      <img src={it.image_url} alt={it.title} loading="lazy"
                        className="size-14 rounded-lg object-cover ring-1 ring-border shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-foreground text-sm font-medium">{it.title}</p>
                      {it.description && <p className="text-toast text-xs line-clamp-1">{it.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!loading && items.length === 0 && (
        <p className="text-toast text-sm text-center py-6">This week's menu hasn't been published yet.</p>
      )}
    </div>
  );
};
