import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, fmtINR, STAGES, STAGE_COLORS } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Phone, Sparkle, ArrowLeft, ChatCircleText } from "@phosphor-icons/react";
import { toast } from "sonner";

const DISPOSITIONS = ["Connected", "Busy", "Not Reachable", "Wrong Number", "Interested", "Not Interested"];

export default function LeadDetail() {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [calls, setCalls] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [callForm, setCallForm] = useState({ duration_seconds: 0, disposition: "Connected", notes: "" });
  const [followupForm, setFollowupForm] = useState({ due_at: "", note: "" });
  const [aiScore, setAiScore] = useState(null);
  const [aiNext, setAiNext] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiBusy, setAiBusy] = useState(null);

  const load = async () => {
    const [a, b, c] = await Promise.all([
      api.get(`/leads/${id}`),
      api.get(`/calls`, { params: { lead_id: id } }),
      api.get(`/followups`, { params: { lead_id: id } }),
    ]);
    setLead(a.data); setCalls(b.data); setFollowups(c.data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const updateField = async (field, value) => {
    const { data } = await api.patch(`/leads/${id}`, { [field]: value });
    setLead(data); toast.success("Updated");
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
    toast.success("Followup added");
    setFollowupForm({ due_at: "", note: "" });
    await load();
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

  if (!lead) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6" data-testid="lead-detail-page">
      <div className="flex items-center gap-3">
        <Link to="/app/leads" className="text-muted-foreground hover:text-foreground"><ArrowLeft size={18} /></Link>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Lead</div>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight">{lead.name}</h1>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 bg-surface border-border shadow-none">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Mobile</Label><div className="flex items-center gap-2 mt-1"><a href={`tel:${lead.mobile}`} className="text-accent font-medium flex items-center gap-1.5"><Phone size={14} /> {lead.mobile}</a></div></div>
            <div><Label>Email</Label><div className="mt-1 text-sm">{lead.email || "—"}</div></div>
            <div><Label>City</Label><div className="mt-1 text-sm">{lead.city || "—"}</div></div>
            <div><Label>Budget</Label><div className="mt-1 text-sm font-semibold">{fmtINR(lead.budget)}</div></div>
            <div><Label>Property type</Label><div className="mt-1 text-sm">{lead.property_type || "—"}</div></div>
            <div><Label>Source</Label><div className="mt-1 text-sm">{lead.source}</div></div>
            <div>
              <Label>Stage</Label>
              <Select value={lead.stage} onValueChange={(v) => updateField("stage", v)}>
                <SelectTrigger data-testid="lead-stage-select"><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={lead.priority || "Medium"} onValueChange={(v) => updateField("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={lead.notes || ""} onChange={(e) => setLead({ ...lead, notes: e.target.value })} onBlur={() => updateField("notes", lead.notes)} rows={3} data-testid="lead-notes-textarea" /></div>
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

      <Tabs defaultValue="calls">
        <TabsList>
          <TabsTrigger value="calls" data-testid="tab-calls">Calls ({calls.length})</TabsTrigger>
          <TabsTrigger value="followups" data-testid="tab-followups">Followups ({followups.length})</TabsTrigger>
        </TabsList>

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

        <TabsContent value="followups" className="space-y-4">
          <Card className="p-5 bg-surface border-border shadow-none">
            <div className="font-heading font-medium mb-3 flex items-center gap-2"><ChatCircleText size={18} /> Schedule followup</div>
            <form onSubmit={onAddFollowup} className="grid sm:grid-cols-3 gap-3">
              <div><Label>Due date</Label><Input type="datetime-local" required value={followupForm.due_at} onChange={(e) => setFollowupForm({ ...followupForm, due_at: e.target.value })} data-testid="followup-due-input" /></div>
              <div className="sm:col-span-2"><Label>Note</Label><Input value={followupForm.note} onChange={(e) => setFollowupForm({ ...followupForm, note: e.target.value })} /></div>
              <div className="sm:col-span-3 flex justify-end"><Button type="submit" data-testid="add-followup-btn">Add</Button></div>
            </form>
          </Card>
          <Card className="bg-surface border-border shadow-none">
            <ul className="divide-y divide-border">
              {followups.map((f) => (
                <li key={f.id} className="p-4 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{new Date(f.due_at).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{f.note || "—"}</div>
                  </div>
                  <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">{f.status}</span>
                </li>
              ))}
              {!followups.length && <li className="p-6 text-sm text-muted-foreground text-center">No followups.</li>}
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
