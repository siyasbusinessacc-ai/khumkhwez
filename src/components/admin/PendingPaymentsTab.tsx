import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PendingPayment = {
  subscription_id: string;
  user_id: string;
  name: string | null;
  surname: string | null;
  email: string | null;
  student_number: string | null;
  plan_name: string;
  plan_price_cents: number;
  amount_cents: number;
  offer_discount_cents: number;
  wallet_discount_cents: number;
  holiday_discount_cents: number;
  offer_codes: string[] | null;
  created_at: string;
};

const rand = (cents: number) =>
  `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const PendingPaymentsTab = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_pending_payments", { _limit: 200 });
    if (error) toast({ title: "Could not load pending payments", description: error.message, variant: "destructive" });
    setRows((data as PendingPayment[]) ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter((r) =>
        [r.name, r.surname, r.email, r.student_number, r.plan_name, ...(r.offer_codes ?? [])]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      )
    : rows;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-foreground">Pending EFT payments</h2>
          <p className="text-toast text-sm mt-1">
            Verify the exact amount each student must pay — discounts they claim must match what's shown here.
          </p>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email, student number or offer code"
      />

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl p-6 ring-1 ring-border text-center text-toast text-sm">
          {loading ? "Loading…" : "No pending payments."}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => {
            const totalDiscount =
              (r.offer_discount_cents ?? 0) + (r.wallet_discount_cents ?? 0) + (r.holiday_discount_cents ?? 0);
            return (
              <div key={r.subscription_id} className="bg-card rounded-2xl p-4 ring-1 ring-border">
                <div className="flex flex-wrap justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-foreground font-medium truncate">
                      {[r.name, r.surname].filter(Boolean).join(" ") || "Unnamed student"}
                    </p>
                    <p className="text-toast text-xs break-all">{r.email ?? "—"}</p>
                    <p className="text-toast text-xs mt-1">
                      {r.plan_name}
                      {r.student_number ? ` · ${r.student_number}` : ""} ·{" "}
                      {new Date(r.created_at).toLocaleString("en-ZA")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-serif text-2xl text-brass tabular-nums">{rand(r.amount_cents)}</p>
                    <p className="text-toast text-xs tabular-nums">
                      {totalDiscount > 0 ? (
                        <>
                          <span className="line-through">{rand(r.plan_price_cents)}</span> · −{rand(totalDiscount)}
                        </>
                      ) : (
                        "no discount"
                      )}
                    </p>
                  </div>
                </div>

                {totalDiscount > 0 && (
                  <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2 text-xs">
                    {r.offer_discount_cents > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-secondary ring-1 ring-border text-foreground">
                        Offer −{rand(r.offer_discount_cents)}
                        {r.offer_codes?.length ? ` (${r.offer_codes.join(", ")})` : ""}
                      </span>
                    )}
                    {r.wallet_discount_cents > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-primary/10 ring-1 ring-primary/30 text-brass">
                        Referral wallet −{rand(r.wallet_discount_cents)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
