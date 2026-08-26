import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WindowStatus = {
  is_open: boolean;
  mode: "scheduled" | "always_open" | "always_closed";
  reason: string;
  opens_at: string | null;
  closes_at: string | null;
  now_local: string | null;
};

export type PlanAvailability = {
  plan_id: string;
  capacity: number | null;
  taken: number;
  remaining: number | null;
  sold_out: boolean;
};

/** Formats a millisecond distance as "3d 4h", "4h 12m" or "12m 30s". */
export const formatCountdown = (ms: number) => {
  if (ms <= 0) return "now";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${sec}s`;
};

/**
 * Local timestamps come back from Postgres without a zone (already in
 * Africa/Johannesburg). Compare them against the server's own "now_local"
 * so the countdown is correct regardless of the device timezone.
 */
export const msUntil = (target: string | null, nowLocal: string | null) => {
  if (!target) return null;
  const t = new Date(target.replace(" ", "T")).getTime();
  const n = nowLocal ? new Date(nowLocal.replace(" ", "T")).getTime() : Date.now();
  return t - n;
};

export const formatLocalDateTime = (v: string | null) => {
  if (!v) return "";
  const d = new Date(v.replace(" ", "T"));
  return d.toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function usePaymentAccess() {
  const [status, setStatus] = useState<WindowStatus | null>(null);
  const [availability, setAvailability] = useState<PlanAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    const [{ data: s }, { data: a }] = await Promise.all([
      supabase.rpc("payment_window_status"),
      supabase.rpc("plan_availability"),
    ]);
    setStatus((s as unknown as WindowStatus) ?? null);
    setAvailability((a as PlanAvailability[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Drive live countdowns — only while there is a boundary to count down to.
  const hasTarget = Boolean(status?.opens_at || status?.closes_at);
  useEffect(() => {
    if (!hasTarget) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [hasTarget]);

  const baseNow = status?.now_local ?? null;
  const shiftedNow = baseNow
    ? new Date(new Date(baseNow.replace(" ", "T")).getTime() + tick * 1000).toISOString()
    : null;

  const availabilityFor = (planId: string) =>
    availability.find((x) => x.plan_id === planId) ?? null;

  return { status, availability, availabilityFor, loading, reload: load, nowLocal: shiftedNow };
}
