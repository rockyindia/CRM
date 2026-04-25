import React, { useEffect, useMemo, useState } from "react";
import { api, fmtINR, STAGES, STAGE_COLORS, SOURCES } from "../lib/api";
import { Link } from "react-router-dom";
import {
  DndContext, useDraggable, useDroppable,
  PointerSensor, TouchSensor, MouseSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { Phone, ArrowSquareOut, BellPlus, X } from "@phosphor-icons/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

function LeadCard({ lead, onAddFollowup }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {};
  return (
    <div
      ref={setNodeRef} style={style}
      className={`border border-border rounded-md p-3 bg-background mb-2 ${isDragging ? "opacity-50" : ""}`}
      data-testid={`kanban-lead-${lead.id}`}
    >
      {/* Drag handle area */}
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing touch-none select-none">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-sm truncate">{lead.name}</span>
          {lead.priority === "High" && <span className="text-[10px] font-bold text-red-500 uppercase">Hot</span>}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone size={12} /> {lead.mobile}</div>
        <div className="text-xs mt-1.5 flex items-center justify-between">
          <span className="text-muted-foreground truncate">{lead.city || "—"}</span>
          <span className="font-semibold">{fmtINR(lead.budget)}</span>
        </div>
      </div>
      {/* Quick actions — outside drag listeners */}
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border">
        <Link to={`/app/leads/${lead.id}`} className="flex-1 inline-flex items-center justify-center gap-1 h-7 text-xs font-medium rounded border border-border hover:bg-surface-hover" data-testid={`kanban-open-${lead.id}`}>
          <ArrowSquareOut size={12} /> Open
        </Link>
        <button onClick={(e) => { e.stopPropagation(); onAddFollowup(lead); }} className="flex-1 inline-flex items-center justify-center gap-1 h-7 text-xs font-medium rounded border border-border hover:bg-surface-hover" data-testid={`kanban-fu-${lead.id}`}>
          <BellPlus size={12} /> Follow-up
        </button>
      </div>
    </div>
  );
}

function Column({ stage, leads, onAddFollowup }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div ref={setNodeRef} className={`min-w-[260px] w-[260px] sm:min-w-[280px] sm:w-[280px] flex flex-col rounded-lg border border-border bg-surface ${isOver ? "ring-2 ring-accent" : ""}`}>
      <div className="px-3 py-3 border-b border-border flex items-center justify-between sticky top-0 bg-surface z-10">
        <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${STAGE_COLORS[stage]}`}>{stage}</span>
        <span className="text-xs text-muted-foreground">{leads.length}</span>
      </div>
      <div className="p-2 flex-1 overflow-y-auto scrollbar-thin min-h-[120px]">
        {leads.map((l) => <LeadCard key={l.id} lead={l} onAddFollowup={onAddFollowup} />)}
        {!leads.length && <div className="text-xs text-muted-foreground text-center py-6">Drop here</div>}
      </div>
    </div>
  );
}

export default function LeadKanban() {
  const [leads, setLeads] = useState([]);
  const [team, setTeam] = useState([]);
  const [assigned, setAssigned] = useState("all");
  const [source, setSource] = useState("all");
  const [fuLead, setFuLead] = useState(null);
  const [fuDate, setFuDate] = useState("");
  const [fuNote, setFuNote] = useState("");

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const load = async () => {
    const [a, b] = await Promise.all([api.get("/leads"), api.get("/team")]);
    setLeads(a.data); setTeam(b.data);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => leads.filter((l) => {
    if (assigned !== "all" && (l.assigned_to || "") !== assigned) return false;
    if (source !== "all" && l.source !== source) return false;
    return true;
  }), [leads, assigned, source]);

  const grouped = useMemo(() => {
    const g = Object.fromEntries(STAGES.map((s) => [s, []]));
    filtered.forEach((l) => { (g[l.stage] || (g[l.stage] = [])).push(l); });
    return g;
  }, [filtered]);

  const onDragEnd = async (e) => {
    const { active, over } = e;
    if (!over) return;
    const newStage = String(over.id);
    if (!STAGES.includes(newStage)) return;
    const lead = leads.find((l) => l.id === active.id);
    if (!lead || lead.stage === newStage) return;
    const oldStage = lead.stage;
    setLeads((ls) => ls.map((l) => (l.id === active.id ? { ...l, stage: newStage } : l)));
    try {
      await api.patch(`/leads/${active.id}`, { stage: newStage });
      toast.success(`${lead.name}: ${oldStage} → ${newStage}`);
    } catch {
      toast.error("Update failed");
      load();
    }
  };

  const submitFollowup = async (e) => {
    e.preventDefault();
    if (!fuLead || !fuDate) return;
    try {
      await api.post("/followups", { lead_id: fuLead.id, due_at: fuDate, note: fuNote });
      toast.success(`Follow-up added for ${fuLead.name}`);
      setFuLead(null); setFuDate(""); setFuNote("");
      load();
    } catch { toast.error("Failed"); }
  };

  return (
    <div className="space-y-5" data-testid="kanban-page">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1">Pipeline</div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Drag to move stages</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2" data-testid="kanban-filters">
        <Select value={assigned} onValueChange={setAssigned}>
          <SelectTrigger className="w-44" data-testid="kanban-assigned-filter"><SelectValue placeholder="All users" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-40" data-testid="kanban-source-filter"><SelectValue placeholder="All sources" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {(assigned !== "all" || source !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setAssigned("all"); setSource("all"); }} data-testid="kanban-clear-filters">
            <X size={14} className="mr-1" /> Clear
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {leads.length} leads</span>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-4 kanban-row -mx-4 px-4 lg:mx-0 lg:px-0">
          {STAGES.map((s) => <Column key={s} stage={s} leads={grouped[s] || []} onAddFollowup={setFuLead} />)}
        </div>
      </DndContext>

      <Dialog open={!!fuLead} onOpenChange={(v) => !v && setFuLead(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add follow-up — {fuLead?.name}</DialogTitle></DialogHeader>
          <form onSubmit={submitFollowup} className="space-y-3">
            <div><Label>Due date *</Label><Input type="datetime-local" required value={fuDate} onChange={(e) => setFuDate(e.target.value)} data-testid="kanban-fu-date" /></div>
            <div><Label>Note</Label><Input value={fuNote} onChange={(e) => setFuNote(e.target.value)} data-testid="kanban-fu-note" /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setFuLead(null)}>Cancel</Button><Button type="submit" disabled={!fuDate} data-testid="kanban-fu-submit">Add follow-up</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
