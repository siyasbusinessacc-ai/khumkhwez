import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Quote = {
  ok: boolean;
  reason?: string;
  offer_name?: string;
  offer_code?: string;
  original_cents?: number;
  discount_cents?: number;
  final_cents?: number;
  committed?: boolean;
};

const fmt = (c?: number) => `R${((c ?? 0) / 100).toFixed(2)}`;

export const WalkInOfferCard = () => {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [priceRand, setPriceRand] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);

  const run = async (commit: boolean) => {
    if (!code.trim() || !priceRand) {
      return toast({ title: "Enter a code and price", variant: "destructive" });
    }
    const cents = Math.round(Number(priceRand) * 100);
    if (!cents || cents <= 0) return toast({ title: "Invalid price", variant: "destructive" });
    setBusy(true);
    const { data, error } = await supabase.rpc("apply_walkin_offer", {
      _code: code.trim().toUpperCase(),
      _price_cents: cents,
      _customer_label: label.trim() || null,
      _commit: commit,
    });
    setBusy(false);
    if (error) {
      setQuote(null);
      return toast({ title: "Could not apply", description: error.message, variant: "destructive" });
    }
    const q = data as Quote;
    setQuote(q);
    if (!q.ok) {
      toast({ title: "Code rejected", description: q.reason ?? "invalid", variant: "destructive" });
    } else if (commit) {
      toast({ title: "Walk-in served", description: `${fmt(q.final_cents)} · ${q.offer_name}` });
      setCode(""); setPriceRand(""); setLabel("");
    }
  };

  return (
    <section className="bg-card rounded-3xl p-6 ring-1 ring-border">
      <h2 className="font-serif text-lg text-foreground mb-1">Walk-in discount</h2>
      <p className="text-toast text-sm mb-4">
        Apply a promo code to a one-off cash sale (not tied to a subscription).
      </p>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CODE"
          className="bg-input text-foreground rounded-xl px-4 py-3 ring-1 ring-border focus:ring-primary outline-none font-mono text-sm uppercase"
        />
        <input
          type="number"
          step="0.01"
          value={priceRand}
          onChange={(e) => setPriceRand(e.target.value)}
          placeholder="Price (R)"
          className="bg-input text-foreground rounded-xl px-4 py-3 ring-1 ring-border focus:ring-primary outline-none text-sm"
        />
      </div>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Customer name (optional)"
        className="w-full bg-input text-foreground rounded-xl px-4 py-3 ring-1 ring-border focus:ring-primary outline-none text-sm mb-3"
      />
      <div className="flex gap-2">
        <button
          onClick={() => run(false)}
          disabled={busy}
          className="flex-1 bg-secondary ring-1 ring-border py-3 rounded-xl text-foreground hover:ring-primary/40 disabled:opacity-50"
        >
          Quote
        </button>
        <button
          onClick={() => run(true)}
          disabled={busy}
          className="flex-1 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "…" : "Confirm sale"}
        </button>
      </div>

      {quote?.ok && (
        <div className="mt-4 bg-background rounded-2xl p-4 ring-1 ring-primary/30">
          <p className="text-brass font-mono text-xs uppercase tracking-wider mb-2">
            ✓ {quote.offer_code} · {quote.offer_name} {quote.committed ? "" : "(quote)"}
          </p>
          <div className="flex justify-between text-sm text-toast">
            <span>Original</span><span className="text-foreground">{fmt(quote.original_cents)}</span>
          </div>
          <div className="flex justify-between text-sm text-toast">
            <span>Discount</span><span className="text-foreground">−{fmt(quote.discount_cents)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold mt-2 pt-2 border-t border-border">
            <span className="text-foreground">Pay</span>
            <span className="text-brass">{fmt(quote.final_cents)}</span>
          </div>
        </div>
      )}
    </section>
  );
};
