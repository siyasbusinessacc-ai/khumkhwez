import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Copy } from "lucide-react";

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
  const diff = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
};
const isoLocal = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export const MenusTab = () => {
  const { toast } = useToast();
  const [weekRef, setWeekRef] = useState<Date>(weekStart(new Date()));
  const [items, setItems] = useState<MenuItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    menu_date: isoLocal(new Date()),
    title: "",
    description: "",
    image_url: "",
  });

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("menu_for_week", { _week_start: isoLocal(weekRef) });
    setItems((data as MenuItem[]) ?? []);
  }, [weekRef]);

  useEffect(() => { load(); }, [load]);

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekRef);
    d.setDate(weekRef.getDate() + i);
    return d;
  });

  const openNew = (date: string) => {
    setEditTarget(null);
    setForm({ menu_date: date, title: "", description: "", image_url: "" });
    setOpen(true);
  };

  const openEdit = (it: MenuItem) => {
    setEditTarget(it.id);
    setForm({
      menu_date: it.menu_date,
      title: it.title,
      description: it.description ?? "",
      image_url: it.image_url ?? "",
    });
    setOpen(true);
  };

  const uploadImage = async (file: File) => {
    setBusy(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("menu-images").upload(path, file);
    if (error) {
      setBusy(false);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl }));
    setBusy(false);
  };

  const save = async () => {
    if (!form.title.trim()) return toast({ title: "Title required", variant: "destructive" });
    setBusy(true);
    const payload = {
      menu_date: form.menu_date,
      title: form.title.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url || null,
    };
    const { error } = editTarget
      ? await supabase.from("menu_items").update(payload).eq("id", editTarget)
      : await supabase.from("menu_items").insert(payload);
    setBusy(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: editTarget ? "Menu item updated" : "Added to menu" });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this menu item?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    load();
  };

  const copyFromPrevWeek = async () => {
    const prev = new Date(weekRef);
    prev.setDate(weekRef.getDate() - 7);
    const { data } = await supabase.rpc("menu_for_week", { _week_start: isoLocal(prev) });
    const prevItems = (data as MenuItem[]) ?? [];
    if (prevItems.length === 0) return toast({ title: "No menu found for previous week" });
    if (!confirm(`Copy ${prevItems.length} item(s) from previous week into this week?`)) return;
    const rows = prevItems.map((it) => {
      const d = new Date(it.menu_date);
      d.setDate(d.getDate() + 7);
      return {
        menu_date: isoLocal(d),
        title: it.title,
        description: it.description,
        image_url: it.image_url,
        sort_order: it.sort_order,
      };
    });
    const { error } = await supabase.from("menu_items").insert(rows);
    if (error) return toast({ title: "Copy failed", description: error.message, variant: "destructive" });
    toast({ title: "Menu duplicated" });
    load();
  };

  const shiftWeek = (dir: number) => {
    const d = new Date(weekRef);
    d.setDate(d.getDate() + dir * 7);
    setWeekRef(d);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-xl text-foreground">Weekly Menu</h2>
          <p className="text-toast text-sm">
            Week of {weekRef.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => shiftWeek(-1)}>← Prev</Button>
          <Button variant="secondary" size="sm" onClick={() => setWeekRef(weekStart(new Date()))}>Today</Button>
          <Button variant="secondary" size="sm" onClick={() => shiftWeek(1)}>Next →</Button>
          <Button size="sm" variant="ghost" onClick={copyFromPrevWeek}>
            <Copy size={14} className="mr-1" /> Copy prev week
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {days.map((d) => {
          const key = isoLocal(d);
          const dayItems = items.filter((i) => i.menu_date === key);
          return (
            <div key={key} className="bg-card rounded-2xl p-4 ring-1 ring-border">
              <div className="flex justify-between items-baseline mb-3">
                <p className="font-serif text-foreground">
                  {DAY_LABELS[d.getDay()]} · {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
                <button onClick={() => openNew(key)}
                  className="text-xs text-brass hover:underline">+ Add dish</button>
              </div>
              {dayItems.length === 0 ? (
                <p className="text-toast text-sm">No items.</p>
              ) : (
                <div className="space-y-2">
                  {dayItems.map((it) => (
                    <div key={it.id} className="flex items-center gap-3 bg-secondary/40 rounded-xl p-2">
                      {it.image_url && <img src={it.image_url} className="size-12 rounded-lg object-cover" alt="" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-medium truncate">{it.title}</p>
                        {it.description && <p className="text-toast text-xs truncate">{it.description}</p>}
                      </div>
                      <button onClick={() => openEdit(it)} className="text-xs text-toast hover:text-foreground px-2">Edit</button>
                      <button onClick={() => remove(it.id)} className="text-toast hover:text-destructive p-1"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card ring-1 ring-border">
          <DialogHeader><DialogTitle className="font-serif">{editTarget ? "Edit dish" : "Add dish"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Date</Label><Input type="date" value={form.menu_date} onChange={(e) => setForm({ ...form, menu_date: e.target.value })} /></div>
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Suya-Spiced Ribeye" /></div>
            <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>Photo</Label>
              <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
              {form.image_url && <img src={form.image_url} alt="preview" className="mt-2 size-32 rounded-lg object-cover ring-1 ring-border" />}
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
