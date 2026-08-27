import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Pin, PinOff, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";

type Broadcast = {
  id: string;
  title: string;
  body: string;
  target: "all" | "tier";
  target_tier: string | null;
  created_at: string;
  expires_at: string | null;
  is_pinned: boolean;
};

const DURATIONS = [
  { value: "24", label: "24 hours" },
  { value: "72", label: "3 days" },
  { value: "168", label: "1 week" },
  { value: "720", label: "1 month" },
  { value: "permanent", label: "Never expires" },
] as const;

const TIERS = ["bronze", "silver", "gold", "elite"] as const;

export const BroadcastsTab = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Broadcast[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    body: "",
    target: "all" as "all" | "tier",
    target_tier: "bronze",
    duration: "168" as string,
    is_pinned: false,
  });

  const load = async () => {
    const { data, error } = await supabase.from("broadcasts").select("*").order("created_at", { ascending: false });
    if (error) return toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setItems((data as Broadcast[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const send = async () => {
    if (!form.title.trim() || !form.body.trim()) return toast({ title: "Title and body required", variant: "destructive" });
    setBusy(true);
    const { error } = await supabase.from("broadcasts").insert([{
      title: form.title.trim(),
      body: form.body.trim(),
      target: form.target,
      target_tier: form.target === "tier" ? (form.target_tier as "bronze" | "silver" | "gold" | "elite") : null,
      expires_at:
        form.duration === "permanent"
          ? null
          : new Date(Date.now() + Number(form.duration) * 3_600_000).toISOString(),
      is_pinned: form.is_pinned,
    }]);
    setBusy(false);
    if (error) return toast({ title: "Send failed", description: error.message, variant: "destructive" });
    toast({ title: "Broadcast sent" });
    setOpen(false);
    setForm({ title: "", body: "", target: "all", target_tier: "bronze", duration: "168", is_pinned: false });
    load();
  };

  const togglePin = async (b: Broadcast) => {
    const { error } = await supabase.from("broadcasts").update({ is_pinned: !b.is_pinned }).eq("id", b.id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    load();
  };

  const expireNow = async (b: Broadcast) => {
    const { error } = await supabase
      .from("broadcasts")
      .update({ expires_at: new Date().toISOString() })
      .eq("id", b.id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    toast({ title: "Announcement hidden from students" });
    load();
  };

  const extend = async (b: Broadcast, hours: number | null) => {
    const { error } = await supabase
      .from("broadcasts")
      .update({ expires_at: hours === null ? null : new Date(Date.now() + hours * 3_600_000).toISOString() })
      .eq("id", b.id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this broadcast?")) return;
    const { error } = await supabase.from("broadcasts").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-serif text-xl text-foreground">Announcements</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>+ New Broadcast</Button></DialogTrigger>
          <DialogContent className="bg-card ring-1 ring-border">
            <DialogHeader><DialogTitle className="font-serif">New Broadcast</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Message</Label><Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Audience</Label>
                  <Select value={form.target} onValueChange={(v: "all" | "tier") => setForm({ ...form, target: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All students</SelectItem>
                      <SelectItem value="tier">Specific tier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.target === "tier" && (
                  <div>
                    <Label>Tier</Label>
                    <Select value={form.target_tier} onValueChange={(v) => setForm({ ...form, target_tier: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIERS.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>How long it shows</Label>
                  <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch checked={form.is_pinned} onCheckedChange={(v) => setForm({ ...form, is_pinned: v })} />
                  <span className="text-sm text-toast">Pin to top</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={send} disabled={busy}>{busy ? "Sending…" : "Send"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {items.map((b) => (
          <div key={b.id} className="bg-card rounded-2xl p-4 ring-1 ring-border">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-serif text-lg text-foreground">{b.title}</p>
                <p className="text-toast text-sm whitespace-pre-line mt-1">{b.body}</p>
                <p className="text-toast text-xs mt-2">
                  {b.target === "all" ? "All students" : `Tier: ${b.target_tier}`} · {new Date(b.created_at).toLocaleString()}
                </p>
                <p className="text-xs mt-1">
                  {b.expires_at == null ? (
                    <span className="text-brass">Never expires</span>
                  ) : new Date(b.expires_at) <= new Date() ? (
                    <span className="text-destructive">Expired — hidden from students</span>
                  ) : (
                    <span className="text-toast">Shows until {new Date(b.expires_at).toLocaleString()}</span>
                  )}
                  {b.is_pinned && <span className="text-brass"> · Pinned</span>}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" variant="secondary" onClick={() => togglePin(b)}>
                    {b.is_pinned ? <PinOff size={14} className="mr-1" /> : <Pin size={14} className="mr-1" />}
                    {b.is_pinned ? "Unpin" : "Pin"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => extend(b, 168)}>
                    <Clock size={14} className="mr-1" /> +1 week
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => extend(b, null)}>Keep forever</Button>
                  <Button size="sm" variant="ghost" onClick={() => expireNow(b)}>Hide now</Button>
                </div>
              </div>
              <button onClick={() => remove(b.id)} className="p-2 text-toast hover:text-destructive"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-toast text-center py-8">No broadcasts yet.</p>}
      </div>
    </div>
  );
};
