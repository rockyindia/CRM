import React, { useEffect, useState, useMemo } from "react";
import { api, fmtINR, STAGES, STAGE_COLORS, SOURCES } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, MagnifyingGlass, Phone } from "@phosphor-icons/react";
import { toast } from "sonner";

const EMPTY = {
  name: "", mobile: "", email: "", city: "",
  source: "Website", budget: "", interested_project: "",
  stage: "New", assigned_to: "", followup_date: "", notes: "",
};

export default function Leads() {
  const { t, user } = useApp();
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [team, setTeam] = useState([]);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const [source, setSource] = useState("all");
  const [assigned, setAssigned] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const params = {};
    if (q) params.q = q;
    if (stage !== "all") params.stage = stage;
    const [{ data: ld }, { data: pj }, { data: tm }] = await Promise.all([
      api.get("/leads", { params }),
      api.get("/projects"),
      api.get("/team"),
    ]);
    setLeads(ld); setProjects(pj); setTeam(tm);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [stage]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (source !== "all" && l.source !== source) return false;
      if (assigned !== "all" && (l.assigned_to || "") !== assigned) return false;
      return true;
    });
  }, [leads, source, assigned]);

  const teamMap = useMemo(() => Object.fromEntries(team.map((m) => [m.id, m.full_name])), [team]);
  const projectMap = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p.name])), [projects]);

  const u = (k) => (e) => setForm({ ...form, [k]: e?.target ? e.target.value : e });

  const onCreate = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        budget: form.budget ? Number(form.budget) : null,
        interested_project: form.interested_project || null,
        assigned_to: form.assigned_to || user?.id || null,
        followup_date: form.followup_date || null,
        email: form.email || null,
      };
      const { data } = await api.post("/leads", payload);
      if (data.duplicate) {
        toast.error(`Duplicate mobile — this lead already exists in your workspace.`);
        setBusy(false);
        return;
      }
      toast.success("Lead created");
      setOpen(false);
      setForm({ ...EMPTY });
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create lead");
    }
    setBusy(false);
  };

  const onSearch = (e) => { e.preventDefault(); load(); };

  return (
    <div className="space-y-6" data-testid="leads-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1">{t("leads")}</div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">All leads</h1>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm({ ...EMPTY }); }}>
          <DialogTrigger asChild><Button data-testid="new-lead-btn"><Plus size={16} className="mr-1" /> {t("new_lead")}</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name *</Label><Input required value={form.name} onChange={u("name")} data-testid="lead-name-input" /></div>
                <div><Label>Mobile *</Label><Input required value={form.mobile} onChange={u("mobile")} data-testid="lead-mobile-input" /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={u("email")} data-testid="lead-email-input" /></div>
                <div><Label>City</Label><Input value={form.city} onChange={u("city")} data-testid="lead-city-input" /></div>
                <div>
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={u("source")}>
                    <SelectTrigger data-testid="lead-source-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Budget (₹)</Label><Input type="number" value={form.budget} onChange={u("budget")} data-testid="lead-budget-input" /></div>
                <div>
                  <Label>Interested Project</Label>
                  <Select value={form.interested_project || "none"} onValueChange={(v) => u("interested_project")(v === "none" ? "" : v)}>
                    <SelectTrigger data-testid="lead-project-select"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Stage</Label>
                  <Select value={form.stage} onValueChange={u("stage")}>
                    <SelectTrigger data-testid="lead-stage-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Assigned User</Label>
                  <Select value={form.assigned_to || "self"} onValueChange={(v) => u("assigned_to")(v === "self" ? "" : v)}>
                    <SelectTrigger data-testid="lead-assigned-select"><SelectValue placeholder="Me" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">— Me ({user?.full_name}) —</SelectItem>
                      {team.filter((m) => m.id !== user?.id).map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name} ({m.role})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Next Follow-up Date</Label>
                  <Input type="datetime-local" value={form.followup_date} onChange={u("followup_date")} data-testid="lead-followup-input" />
                </div>
              </div>
              <div>
                <Label>Remarks</Label>
                <Textarea value={form.notes} onChange={u("notes")} rows={3} data-testid="lead-remarks-textarea" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
                <Button type="submit" disabled={busy} data-testid="submit-lead-btn">{busy ? "Saving…" : t("save")}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={onSearch} className="relative flex-1 min-w-[220px] max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name, mobile or city…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" data-testid="leads-search-input" />
        </form>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="w-44" data-testid="leads-stage-filter"><SelectValue placeholder="All stages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-40" data-testid="leads-source-filter"><SelectValue placeholder="All sources" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {user?.role === "owner" && (
          <Select value={assigned} onValueChange={setAssigned}>
            <SelectTrigger className="w-44" data-testid="leads-assigned-filter"><SelectValue placeholder="All users" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {(q || stage !== "all" || source !== "all" || assigned !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setQ(""); setStage("all"); setSource("all"); setAssigned("all"); setTimeout(load, 0); }} data-testid="leads-clear-filters">
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg bg-surface overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Mobile</th>
              <th className="py-3 px-4">City</th>
              <th className="py-3 px-4">Budget</th>
              <th className="py-3 px-4">Project</th>
              <th className="py-3 px-4">Source</th>
              <th className="py-3 px-4">Stage</th>
              <th className="py-3 px-4">Assigned</th>
              <th className="py-3 px-4">Next FU</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => {
              const overdue = l.followup_date && l.stage !== "Won" && l.stage !== "Lost" && l.stage !== "Booked"
                && new Date(l.followup_date) < new Date(new Date().setHours(0, 0, 0, 0));
              return (
              <tr key={l.id} className={`border-b border-border last:border-0 hover:bg-surface-hover ${overdue ? "border-l-4 border-l-destructive" : ""}`} data-testid={`lead-row-${l.id}`}>
                <td className="py-3 px-4">
                  <Link to={`/app/leads/${l.id}`} className="font-medium hover:text-accent" data-testid={`lead-open-${l.id}`}>{l.name}</Link>
                </td>
                <td className="py-3 px-4 text-muted-foreground">
                  <a href={`tel:${l.mobile}`} className="hover:text-accent flex items-center gap-1"><Phone size={13} />{l.mobile}</a>
                </td>
                <td className="py-3 px-4 text-muted-foreground">{l.city || "—"}</td>
                <td className="py-3 px-4">{fmtINR(l.budget)}</td>
                <td className="py-3 px-4 text-muted-foreground">{projectMap[l.interested_project] || "—"}</td>
                <td className="py-3 px-4 text-muted-foreground">{l.source}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${STAGE_COLORS[l.stage] || ""}`}>{l.stage}</span>
                </td>
                <td className="py-3 px-4 text-muted-foreground">{teamMap[l.assigned_to] || "—"}</td>
                <td className={`py-3 px-4 ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                  {l.followup_date ? new Date(l.followup_date).toLocaleDateString() : "—"}
                  {overdue && <span className="ml-1 text-[10px] uppercase">overdue</span>}
                </td>
                <td className="py-3 px-4">
                  <Link to={`/app/leads/${l.id}`} className="text-accent text-xs font-semibold">Open</Link>
                </td>
              </tr>
              );
            })}
            {!filtered.length && (
              <tr><td colSpan={10} className="py-12 text-center text-muted-foreground">No leads match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-muted-foreground">{filtered.length} of {leads.length} leads</div>
    </div>
  );
}
