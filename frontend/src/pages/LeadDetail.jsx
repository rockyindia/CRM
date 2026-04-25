import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, fmtINR, STAGES, SOURCES, isOverdueDate } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { Phone, Sparkle, ArrowLeft, ChatCircleText, PencilSimple, Trash, Clock } from "@phosphor-icons/react";
import { toast } from "sonner";

const DISPOSITIONS = ["Connected", "Busy", "Not Reachable", "Wrong Number", "Interested", "Not Interested"];

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [calls, setCalls] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [team, setTeam] = useState([]);
  const [projects, setProjects] = useState([]);
  const [callForm, setCallForm] = useState({ duration_seconds: 0, disposition: "Connected", notes: "" });
  const [followupForm, setFollowupForm] = useState({ due_at: "", note: "" });
  const [doneId, setDoneId] = useState(null);
  const [nextDate, setNextDate] = useState("");
  const [nextNote, setNextNote] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [aiScore, setAiScore] = useState(null);
  const [aiNext, setAiNext] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiBusy, setAiBusy] = useState(null);
  const [history, setHistory] = useState([]);

  const teamMap = useMemo(() => Object.fromEntries(team.map((m) => [m.id, m.full_name])), [team]);
  const projectMap = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p.name])), [projects]);

  const load = async () => {
    const [a, b, c, t, p, h] = await Promise.all([
      api.get(`/leads/${id}`),
      api.get(`/calls`, { params: { lead_id: id } }),
      api.get(`/followups`, { params: { lead_id: id } }),
      api.get(`/team`),
      api.get(`/projects`),
      api.get(`/leads/${id}/history`),
    ]);
    setLead(a.data); setCalls(b.data); setFollowups(c.data);
    setTeam(t.data); setProjects(p.data); setHistory(h.data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const updateField = async (field, value) => {
    try {
      const { data } = await api.patch(`/leads/${id}`, { [field]: value });
      setLead(data); toast.success("Updated");
    } catch (e) { toast.error("Update failed"); }
  };

  const onLogCall = async (e) => {
    e.preventDefault();
    await api.post("/calls", { lead_id: id, ...callForm, duration_seconds: Number(callForm.duration_seconds) || 0 });
    toast.success("Call logged");
    setCallForm({ duration_seconds: 0, disposition: "Connected", notes: "" });
    await load();
  };

  const onAddFollowup = async (e) => {
    e.preventDefault();
    await api.post("/followups", { lead_id: id, due_at: followupForm.due_at, note: followupForm.note });
    toast.success("Follow-up added");
    setFollowupForm({ due_at: "", note: "" });
    await load();
  };

  const markFollowupDone = async (fid, withNext) => {
    const body = { status: "Done" };
    if (withNext && nextDate) { body.next_due_at = nextDate; body.next_note = nextNote || ""; }
    try {
      await api.patch(`/followups/${fid}`, body);
      toast.success(withNext ? "Done — next follow-up scheduled" : "Marked as Done");
      setDoneId(null); setNextDate(""); setNextNote("");
      await load();
    } catch { toast.error("Failed"); }
  };

  const openEdit = () => {
    setEditForm({
      name: lead.name || "", mobile: lead.mobile || "", email: lead.email || "",
      city: lead.city || "", budget: lead.budget || "", source: lead.source || "Website",
      interested_project: lead.interested_project || "", assigned_to: lead.assigned_to || "",
      followup_date: lead.followup_date ? lead.followup_date.slice(0, 16) : "",
      notes: lead.notes || "",
    });
    setEditOpen(true);
  };

  const onEditSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editForm,
        budget: editForm.budget ? Number(editForm.budget) : null,
        interested_project: editForm.interested_project || null,
        assigned_to: editForm.assigned_to || null,
        followup_date: editForm.followup_date || null,
        email: editForm.email || null,
      };
      const { data } = await api.patch(`/leads/${id}`, payload);
      setLead(data); setEditOpen(false); toast.success("Lead updated");
    } catch (err) { toast.error(err?.response?.data?.detail || "Update failed"); }
  };

  const onDelete = async () => {
    try {
      await api.delete(`/leads/${id}`);
      toast.success("Lead deleted");
      navigate("/app/leads");
    } catch { toast.error("Delete failed"); }
  };

  const runAI = async (kind) => {
    setAiBusy(kind);
    try {
      const { data } = await api.post(`/ai/${kind}`, { lead_id: id });
      if (kind === "lead-score") { setAiScore(data); await load(); }
      else if (kind === "next-action") setAiNext(data);
      else setAiSummary(data);
      toast.success("AI ready");
    } catch (e) { toast.error(e?.response?.data?.detail?.slice(0, 120) || "AI error"); }
    setAiBusy(null);
  };

  const u = (k) => (e) => setEditForm({ ...editForm, [k]: e?.target ? e.target.value : e });

  if (!lead) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6" data-testid="lead-detail-page">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/app/leads" className="text-muted-foreground hover:text-foreground"><ArrowLeft size={18} /></Link>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Lead</div>
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight">{lead.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openEdit} data-testid="edit-lead-btn"><PencilSimple size={14} className="mr-1" /> Edit</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive hover:text-destructive" data-testid="delete-lead-btn"><Trash size={14} className="mr-1" /> Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove <span className="font-semibold">{lead.name}</span> and all their call logs & follow-ups. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="confirm-delete-btn">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 bg-surface border-border shadow-none">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Mobile</Label><div className="mt-1"><a href={`tel:${lead.mobile}`} className="text-accent font-medium flex items-center gap-1.5"><Phone size={14} /> {lead.mobile}</a></div></div>
            <div><Label>Email</Label><div className="mt-1 text-sm">{lead.email || "—"}</div></div>
            <div><Label>City</Label><div className="mt-1 text-sm">{lead.city || "—"}</div></div>
            <div><Label>Budget</Label><div className="mt-1 text-sm font-semibold">{fmtINR(lead.budget)}</div></div>
            <div><Label>Source</Label><div className="mt-1 text-sm">{lead.source}</div></div>
            <div><Label>Interested Project</Label><div className="mt-1 text-sm">{projectMap[lead.interested_project] || "—"}</div></div>
            <div>
              <Label>Stage</Label>
              <Select value={lead.stage} onValueChange={(v) => updateField("stage", v)}>
                <SelectTrigger data-testid="lead-stage-select"><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assigned User</Label>
              <Select value={lead.assigned_to || "_none"} onValueChange={(v) => updateField("assigned_to", v === "_none" ? null : v)}>
                <SelectTrigger data-testid="lead-assigned-select"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Unassigned —</SelectItem>
                  {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name} ({m.role})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Next Follow-up</Label>
              <Input
                type="datetime-local"
                value={lead.followup_date ? lead.followup_date.slice(0, 16) : ""}
                onChange={(e) => setLead({ ...lead, followup_date: e.target.value })}
                onBlur={() => updateField("followup_date", lead.followup_date || null)}
                data-testid="lead-detail-followup-input"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Remarks</Label>
              <Textarea
                value={lead.notes || ""}
                onChange={(e) => setLead({ ...lead, notes: e.target.value })}
                onBlur={() => updateField("notes", lead.notes || "")}
                rows={3}
                data-testid="lead-notes-textarea"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-surface border-border shadow-none">
          <div className="flex items-center gap-2 mb-3"><Sparkle size={18} weight="duotone" className="text-accent" /><div className="font-heading font-semibold">AI Insights</div></div>
          <div className="space-y-3">
            <Button className="w-full" variant="outline" onClick={() => runAI("lead-score")} disabled={aiBusy === "lead-score"} data-testid="ai-score-btn">{aiBusy === "lead-score" ? "Scoring…" : "Score Lead"}</Button>
            {(aiScore || lead.score) && (
              <div className="border border-border rounded-md p-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-muted-foreground text-xs uppercase tracking-wider">Score</span><span className="font-heading text-2xl font-semibold">{aiScore?.score ?? lead.score}</span></div>
                <div className="text-xs mt-1 text-muted-foreground">{aiScore?.reason || lead.ai_reason}</div>
              </div>
            )}
            <Button className="w-full" variant="outline" onClick={() => runAI("next-action")} disabled={aiBusy === "next-action"} data-testid="ai-next-btn">{aiBusy === "next-action" ? "Thinking…" : "Suggest Next Action"}</Button>
            {aiNext && (
              <div className="border border-border rounded-md p-3 text-sm space-y-1">
                <div><span className="text-xs text-muted-foreground uppercase tracking-wider">Action: </span>{aiNext.action}</div>
                <div className="text-xs text-muted-foreground">Timing: {aiNext.timing}</div>
                <div className="text-xs italic">"{aiNext.message}"</div>
              </div>
            )}
            <Button className="w-full" variant="outline" onClick={() => runAI("summary")} disabled={aiBusy === "summary"} data-testid="ai-summary-btn">{aiBusy === "summary" ? "Summarising…" : "Summary"}</Button>
            {aiSummary && <div className="border border-border rounded-md p-3 text-sm whitespace-pre-wrap">{aiSummary.summary}</div>}
          </div>
        </Card>
      </div>

      <Tabs defaultValue="followups">
        <TabsList>
          <TabsTrigger value="followups" data-testid="tab-followups">Follow-ups ({followups.length})</TabsTrigger>
          <TabsTrigger value="calls" data-testid="tab-calls">Calls ({calls.length})</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="followups" className="space-y-4">
          <Card className="p-5 bg-surface border-border shadow-none">
            <div className="font-heading font-medium mb-3 flex items-center gap-2"><ChatCircleText size={18} /> Add follow-up note</div>
            <form onSubmit={onAddFollowup} className="grid sm:grid-cols-3 gap-3">
              <div><Label>Due date</Label><Input type="datetime-local" required value={followupForm.due_at} onChange={(e) => setFollowupForm({ ...followupForm, due_at: e.target.value })} data-testid="followup-due-input" /></div>
              <div className="sm:col-span-2"><Label>Note</Label><Input value={followupForm.note} onChange={(e) => setFollowupForm({ ...followupForm, note: e.target.value })} data-testid="followup-note-input" /></div>
              <div className="sm:col-span-3 flex justify-end"><Button type="submit" disabled={!followupForm.due_at} data-testid="add-followup-btn">Add follow-up</Button></div>
            </form>
          </Card>
          <Card className="p-5 bg-surface border-border shadow-none">
            <div className="font-heading font-medium mb-4 flex items-center gap-2"><Clock size={18} /> Follow-up history</div>
            {followups.length ? (
              <ol className="relative border-l border-border ml-2 space-y-4 pl-5">
                {followups.map((f) => {
                  const overdue = f.status === "Pending" && isOverdueDate(f.due_at);
                  return (
                  <li key={f.id} className="relative" data-testid={`followup-${f.id}`}>
                    <span className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-background ${
                      f.status === "Done" ? "bg-success" : overdue ? "bg-destructive" : "bg-warning"
                    }`} />
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {new Date(f.due_at).toLocaleString()}
                          {overdue && <span className="ml-2 text-[10px] uppercase tracking-wider font-bold text-destructive">Overdue</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{f.note || "No note"}</div>
                        <div className="text-[10px] uppercase tracking-wider font-bold mt-1">
                          <span className={f.status === "Done" ? "text-success" : "text-warning"}>{f.status}</span>
                          <span className="text-muted-foreground"> • added {new Date(f.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {f.status === "Pending" && (
                        <div>
                          {doneId === f.id ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Input type="datetime-local" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="h-8 w-48" placeholder="Next" />
                              <Input value={nextNote} onChange={(e) => setNextNote(e.target.value)} className="h-8 w-40" placeholder="Next note" />
                              <Button size="sm" onClick={() => markFollowupDone(f.id, true)} disabled={!nextDate} data-testid={`save-next-${f.id}`}>Done + Schedule</Button>
                              <Button size="sm" variant="ghost" onClick={() => markFollowupDone(f.id, false)}>Just done</Button>
                              <Button size="sm" variant="ghost" onClick={() => { setDoneId(null); setNextDate(""); setNextNote(""); }}>Cancel</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => setDoneId(f.id)} data-testid={`mark-done-${f.id}`}>Mark Done</Button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                  );
                })}
              </ol>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-6">No follow-ups yet.</div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="calls" className="space-y-4">
          <Card className="p-5 bg-surface border-border shadow-none">
            <div className="font-heading font-medium mb-3 flex items-center gap-2"><Phone size={18} /> Log a call</div>
            <form onSubmit={onLogCall} className="grid sm:grid-cols-4 gap-3">
              <div>
                <Label>Disposition</Label>
                <Select value={callForm.disposition} onValueChange={(v) => setCallForm({ ...callForm, disposition: v })}>
                  <SelectTrigger data-testid="call-disposition-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{DISPOSITIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Duration (sec)</Label><Input type="number" value={callForm.duration_seconds} onChange={(e) => setCallForm({ ...callForm, duration_seconds: e.target.value })} data-testid="call-duration-input" /></div>
              <div className="sm:col-span-2"><Label>Notes</Label><Input value={callForm.notes} onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })} /></div>
              <div className="sm:col-span-4 flex justify-end gap-2">
                <a href={`tel:${lead.mobile}`} className="inline-flex items-center justify-center h-9 px-4 rounded-md border border-border text-sm font-medium hover:bg-surface-hover" data-testid="click-to-call-btn"><Phone size={14} className="mr-2" />Call now</a>
                <Button type="submit" data-testid="log-call-btn">Log call</Button>
              </div>
            </form>
          </Card>
          <Card className="bg-surface border-border shadow-none">
            <ul className="divide-y divide-border">
              {calls.map((c) => (
                <li key={c.id} className="p-4 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{c.disposition} <span className="text-xs text-muted-foreground">• {c.duration_seconds}s</span></div>
                    <div className="text-xs text-muted-foreground">{c.notes || "No notes"}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
                </li>
              ))}
              {!calls.length && <li className="p-6 text-sm text-muted-foreground text-center">No calls logged yet.</li>}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="p-5 bg-surface border-border shadow-none">
            <div className="font-heading font-medium mb-4 flex items-center gap-2"><Clock size={18} /> Activity history</div>
            {history.length ? (
              <ol className="relative border-l border-border ml-2 space-y-3 pl-5">
                {history.map((h) => (
                  <li key={h.id} className="relative" data-testid={`history-${h.id}`}>
                    <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full bg-accent border-2 border-background" />
                    <div className="text-sm">
                      Stage changed from <span className="font-semibold">{h.from || "—"}</span> to <span className="font-semibold">{h.to}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      by {h.user_name || "—"} • {new Date(h.created_at).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-6">No stage changes yet.</div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Lead dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Lead</DialogTitle></DialogHeader>
          <form onSubmit={onEditSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input required value={editForm.name} onChange={u("name")} data-testid="edit-lead-name" /></div>
              <div><Label>Mobile</Label><Input required value={editForm.mobile} onChange={u("mobile")} data-testid="edit-lead-mobile" /></div>
              <div><Label>Email</Label><Input type="email" value={editForm.email} onChange={u("email")} /></div>
              <div><Label>City</Label><Input value={editForm.city} onChange={u("city")} /></div>
              <div>
                <Label>Source</Label>
                <Select value={editForm.source} onValueChange={u("source")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Budget (₹)</Label><Input type="number" value={editForm.budget} onChange={u("budget")} /></div>
              <div>
                <Label>Interested Project</Label>
                <Select value={editForm.interested_project || "none"} onValueChange={(v) => u("interested_project")(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assigned User</Label>
                <Select value={editForm.assigned_to || "none"} onValueChange={(v) => u("assigned_to")(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Unassigned —</SelectItem>
                    {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Next Follow-up</Label>
                <Input type="datetime-local" value={editForm.followup_date || ""} onChange={u("followup_date")} />
              </div>
            </div>
            <div><Label>Remarks</Label><Textarea rows={3} value={editForm.notes} onChange={u("notes")} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="save-edit-lead-btn">Save changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
