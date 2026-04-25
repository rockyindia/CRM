import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Calendar } from "@phosphor-icons/react";
import { toast } from "sonner";

const STATUSES = ["Scheduled", "Completed", "No-Show", "Cancelled"];

export default function SiteVisits() {
  const [items, setItems] = useState([]);
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ lead_id: "", project_id: "", scheduled_at: "", pickup_address: "", notes: "" });

  const load = async () => {
    const [a, b, c] = await Promise.all([api.get("/site-visits"), api.get("/leads"), api.get("/projects")]);
    setItems(a.data); setLeads(b.data); setProjects(c.data);
  };
  useEffect(() => { load(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    await api.post("/site-visits", { ...form, project_id: form.project_id || null });
    toast.success("Site visit scheduled");
    setForm({ lead_id: "", project_id: "", scheduled_at: "", pickup_address: "", notes: "" });
    setOpen(false); load();
  };
  const update = async (id, status) => {
    await api.patch(`/site-visits/${id}`, { status });
    toast.success("Updated"); load();
  };

  return (
    <div className="space-y-6" data-testid="site-visits-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1">Site Visits</div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Schedule & track visits</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="schedule-visit-btn"><Plus size={16} className="mr-1" />Schedule Visit</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule Site Visit</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-3">
              <div><Label>Lead</Label>
                <Select value={form.lead_id} onValueChange={(v) => setForm({ ...form, lead_id: v })}>
                  <SelectTrigger data-testid="visit-lead-select"><SelectValue placeholder="Select lead" /></SelectTrigger>
                  <SelectContent>{leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name} • {l.mobile}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Project</Label>
                <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Date & Time</Label><Input type="datetime-local" required value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} data-testid="visit-datetime-input" /></div>
              <div><Label>Pickup address</Label><Input value={form.pickup_address} onChange={(e) => setForm({ ...form, pickup_address: e.target.value })} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={!form.lead_id} data-testid="submit-visit-btn">Schedule</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-surface border-border shadow-none">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-3 px-4">Lead</th><th className="py-3 px-4">When</th><th className="py-3 px-4">Pickup</th>
                <th className="py-3 px-4">Status</th><th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => {
                const lead = leads.find((l) => l.id === v.lead_id);
                return (
                  <tr key={v.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-4 font-medium">{lead?.name || "—"}</td>
                    <td className="py-3 px-4">{new Date(v.scheduled_at).toLocaleString()}</td>
                    <td className="py-3 px-4 text-muted-foreground">{v.pickup_address || "—"}</td>
                    <td className="py-3 px-4">
                      <Select value={v.status} onValueChange={(val) => update(v.id, val)}>
                        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{v.notes || "—"}</td>
                  </tr>
                );
              })}
              {!items.length && <tr><td colSpan={5} className="py-12 text-center text-muted-foreground"><Calendar size={32} className="mx-auto mb-2 opacity-50" />No site visits scheduled.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
