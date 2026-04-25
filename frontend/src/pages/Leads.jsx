import React, { useEffect, useState } from "react";
import { api, fmtINR, STAGES, STAGE_COLORS, SOURCES } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, MagnifyingGlass, Phone } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Leads() {
  const { t } = useApp();
  const [leads, setLeads] = useState([]);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", email: "", budget: "", city: "", property_type: "", source: "Manual", stage: "New", priority: "Medium", notes: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const params = {};
    if (q) params.q = q;
    if (stage && stage !== "all") params.stage = stage;
    const { data } = await api.get("/leads", { params });
    setLeads(data);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [stage]);

  const onCreate = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, budget: form.budget ? Number(form.budget) : null };
      const { data } = await api.post("/leads", payload);
      if (data.duplicate) { toast.warning("Duplicate mobile — existing lead opened"); }
      else toast.success("Lead created");
      setOpen(false);
      setForm({ name: "", mobile: "", email: "", budget: "", city: "", property_type: "", source: "Manual", stage: "New", priority: "Medium", notes: "" });
      await load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Failed"); }
    setBusy(false);
  };

  const u = (k) => (e) => setForm({ ...form, [k]: e?.target ? e.target.value : e });

  return (
    <div className="space-y-6" data-testid="leads-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1">{t("leads")}</div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">All leads</h1>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:w-72">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} className="pl-9" data-testid="leads-search-input" />
          </div>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="w-44" data-testid="leads-stage-filter"><SelectValue placeholder="All stages" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button data-testid="new-lead-btn"><Plus size={16} className="mr-1" /> {t("new_lead")}</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
              <form onSubmit={onCreate} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Name</Label><Input required value={form.name} onChange={u("name")} data-testid="lead-name-input" /></div>
                  <div><Label>Mobile</Label><Input required value={form.mobile} onChange={u("mobile")} data-testid="lead-mobile-input" /></div>
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={u("email")} /></div>
                  <div><Label>City</Label><Input value={form.city} onChange={u("city")} /></div>
                  <div><Label>Budget (₹)</Label><Input type="number" value={form.budget} onChange={u("budget")} /></div>
                  <div><Label>Property type</Label><Input value={form.property_type} onChange={u("property_type")} placeholder="2BHK, Villa, Plot..." /></div>
                  <div>
                    <Label>Source</Label>
                    <Select value={form.source} onValueChange={u("source")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Stage</Label>
                    <Select value={form.stage} onValueChange={u("stage")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={u("priority")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={u("notes")} /></div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
                  <Button type="submit" disabled={busy} data-testid="submit-lead-btn">{busy ? "Saving…" : t("save")}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border border-border rounded-lg bg-surface overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="py-3 px-4">Name</th><th className="py-3 px-4">Mobile</th>
              <th className="py-3 px-4">City</th><th className="py-3 px-4">{t("budget")}</th>
              <th className="py-3 px-4">{t("source")}</th><th className="py-3 px-4">{t("stage")}</th>
              <th className="py-3 px-4">Score</th><th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0 hover:bg-surface-hover" data-testid={`lead-row-${l.id}`}>
                <td className="py-3 px-4 font-medium">{l.name}</td>
                <td className="py-3 px-4 text-muted-foreground"><a href={`tel:${l.mobile}`} className="hover:text-accent flex items-center gap-1"><Phone size={13} />{l.mobile}</a></td>
                <td className="py-3 px-4 text-muted-foreground">{l.city || "—"}</td>
                <td className="py-3 px-4">{fmtINR(l.budget)}</td>
                <td className="py-3 px-4 text-muted-foreground">{l.source}</td>
                <td className="py-3 px-4"><span className={`px-2 py-0.5 text-xs font-semibold rounded border ${STAGE_COLORS[l.stage] || ""}`}>{l.stage}</span></td>
                <td className="py-3 px-4">{l.score ?? "—"}</td>
                <td className="py-3 px-4"><Link to={`/app/leads/${l.id}`} className="text-accent text-xs font-semibold">Open</Link></td>
              </tr>
            ))}
            {!leads.length && <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">No leads yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
