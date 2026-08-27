import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Detail = {
  ok: boolean;
  reason?: string;
  profile: {
    user_id: string;
    name: string | null;
    surname: string | null;
    email: string | null;
    student_number: string | null;
    primary_phone: string | null;
    secondary_phone: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    avatar_url: string | null;
    qr_code_pass: string | null;
    tier: string | null;
    wallet_balance_cents: number;
    created_at: string;
  };
  roles: string[];
  subscriptions: {
    id: string;
    status: string;
    plan_name: string;
    plan_code: string;
    amount_cents: number;
    start_date: string | null;
    end_date: string | null;
    activated_at: string | null;
    created_at: string;
  }[];
  recent_redemptions: { id: string; redeemed_on: string; redeemed_at: string; slot_label: string | null }[];
  meals_total: number;
  referrals: { paid: number; pending: number };
};

const rand = (cents: number) => `R${(cents / 100).toFixed(2)}`;

const Row = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className="min-w-0">
    <p className="text-toast text-[11px] uppercase tracking-wider">{label}</p>
    <p className="text-foreground text-sm break-words">{value || "—"}</p>
  </div>
);

export const UserDetailDialog = ({
  userId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  userId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [detail, setDetail] = useState<Detail | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    setAvatar(null);
    supabase
      .rpc("admin_user_detail", { _target_user: userId })
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
        const d = data as unknown as Detail;
        if (!d?.ok) {
          setError(d?.reason === "forbidden" ? "You don't have permission to view this profile." : "Profile not found.");
          setLoading(false);
          return;
        }
        setDetail(d);
        setLoading(false);
        if (d.profile.avatar_url) {
          const { data: signed } = await supabase.storage
            .from("avatars")
            .createSignedUrl(d.profile.avatar_url, 3600);
          if (!cancelled) setAvatar(signed?.signedUrl ?? null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const p = detail?.profile;
  const active = detail?.subscriptions.find((s) => s.status === "active");
  const pending = detail?.subscriptions.find((s) => s.status === "pending");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <div onClick={() => setOpen(true)}>{trigger}</div>}
      <DialogContent className="bg-card ring-1 ring-border max-w-lg max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Student profile</DialogTitle>
        </DialogHeader>

        {loading && <p className="text-toast text-sm py-8 text-center">Loading profile…</p>}
        {error && <p className="text-destructive text-sm py-8 text-center">{error}</p>}

        {p && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-secondary ring-1 ring-border flex items-center justify-center shrink-0">
                {avatar ? (
                  <img src={avatar} alt={`${p.name ?? "Student"} profile photo`} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-serif text-2xl text-toast">
                    {(p.name?.[0] ?? p.email?.[0] ?? "?").toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-serif text-xl text-foreground truncate">
                  {p.name ?? "—"} {p.surname ?? ""}
                </h3>
                <p className="text-toast text-sm truncate">{p.email}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/20 text-brass ring-1 ring-primary/40 capitalize">
                    {p.tier ?? "bronze"}
                  </span>
                  {detail!.roles.map((r) => (
                    <span key={r} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-toast ring-1 ring-border">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <section className="bg-secondary/40 rounded-xl p-4 ring-1 ring-border">
              <p className="text-toast text-xs uppercase tracking-wider mb-2">Current package</p>
              {active ? (
                <>
                  <p className="font-serif text-lg text-foreground">{active.plan_name}</p>
                  <p className="text-toast text-sm">
                    {active.start_date} → {active.end_date} · {rand(active.amount_cents)}
                  </p>
                </>
              ) : pending ? (
                <p className="text-sm text-foreground">
                  Reserved (awaiting payment): {pending.plan_name} · {rand(pending.amount_cents)}
                </p>
              ) : (
                <p className="text-sm text-destructive">No active package</p>
              )}
            </section>

            <div className="grid grid-cols-2 gap-4">
              <Row label="Primary phone" value={p.primary_phone} />
              <Row label="Secondary phone" value={p.secondary_phone} />
              <Row label="Emergency contact" value={p.emergency_contact_name} />
              <Row label="Emergency phone" value={p.emergency_contact_phone} />
              <Row label="QR pass" value={p.qr_code_pass} />
              <Row label="Wallet credit" value={rand(p.wallet_balance_cents ?? 0)} />
              <Row label="Meals collected" value={String(detail!.meals_total)} />
              <Row
                label="Referrals"
                value={`${detail!.referrals.paid} paid · ${detail!.referrals.pending} pending`}
              />
              <Row label="Joined" value={new Date(p.created_at).toLocaleDateString("en-ZA")} />
            </div>

            <section>
              <p className="text-toast text-xs uppercase tracking-wider mb-2">Package history</p>
              <div className="space-y-1.5">
                {detail!.subscriptions.map((s) => (
                  <div key={s.id} className="flex justify-between gap-3 text-sm">
                    <span className="text-foreground truncate">{s.plan_name}</span>
                    <span className="text-toast shrink-0">
                      {s.status} · {s.end_date ?? new Date(s.created_at).toLocaleDateString("en-ZA")}
                    </span>
                  </div>
                ))}
                {detail!.subscriptions.length === 0 && <p className="text-toast text-sm">No packages yet.</p>}
              </div>
            </section>

            <section>
              <p className="text-toast text-xs uppercase tracking-wider mb-2">Recent meals</p>
              <div className="space-y-1.5">
                {detail!.recent_redemptions.map((r) => (
                  <div key={r.id} className="flex justify-between gap-3 text-sm">
                    <span className="text-foreground">{r.redeemed_on}</span>
                    <span className="text-toast">
                      {r.slot_label ?? "—"} ·{" "}
                      {new Date(r.redeemed_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
                {detail!.recent_redemptions.length === 0 && <p className="text-toast text-sm">No meals collected yet.</p>}
              </div>
            </section>

            <Button variant="secondary" className="w-full" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
