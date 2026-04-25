import React, { useEffect, useMemo, useState } from "react";
import { api, fmtINR, STAGES, STAGE_COLORS } from "../lib/api";
import { Link } from "react-router-dom";
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Phone } from "@phosphor-icons/react";
import { toast } from "sonner";

function LeadCard({ lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {};
  return (
    <div
      ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`border border-border rounded-md p-3 bg-background mb-2 cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
      data-testid={`kanban-lead-${lead.id}`}
    >
      <div className="flex items-center justify-between mb-1">
        <Link to={`/app/leads/${lead.id}`} className="font-medium text-sm hover:text-accent" onClick={(e) => e.stopPropagation()}>{lead.name}</Link>
        {lead.priority === "High" && <span className="text-[10px] font-bold text-red-500 uppercase">Hot</span>}
      </div>
      <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone size={12} /> {lead.mobile}</div>
      <div className="text-xs mt-1.5 flex items-center justify-between">
        <span className="text-muted-foreground">{lead.city || "—"}</span>
        <span className="font-semibold">{fmtINR(lead.budget)}</span>
      </div>
    </div>
  );
}

function Column({ stage, leads }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div ref={setNodeRef} className={`min-w-[280px] w-[280px] flex flex-col rounded-lg border border-border bg-surface ${isOver ? "ring-2 ring-accent" : ""}`}>
      <div className="px-3 py-3 border-b border-border flex items-center justify-between sticky top-0 bg-surface z-10">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${STAGE_COLORS[stage]}`}>{stage}</span>
        </div>
        <span className="text-xs text-muted-foreground">{leads.length}</span>
      </div>
      <div className="p-2 flex-1 overflow-y-auto scrollbar-thin min-h-[120px]">
        {leads.map((l) => <LeadCard key={l.id} lead={l} />)}
        {!leads.length && <div className="text-xs text-muted-foreground text-center py-6">Drop here</div>}
      </div>
    </div>
  );
}

export default function LeadKanban() {
  const [leads, setLeads] = useState([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    const { data } = await api.get("/leads");
    setLeads(data);
  };
  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const g = Object.fromEntries(STAGES.map((s) => [s, []]));
    leads.forEach((l) => { (g[l.stage] || (g[l.stage] = [])).push(l); });
    return g;
  }, [leads]);

  const onDragEnd = async (e) => {
    const { active, over } = e;
    if (!over) return;
    const newStage = String(over.id);
    if (!STAGES.includes(newStage)) return;
    const lead = leads.find((l) => l.id === active.id);
    if (!lead || lead.stage === newStage) return;
    setLeads((ls) => ls.map((l) => (l.id === active.id ? { ...l, stage: newStage } : l)));
    try {
      await api.patch(`/leads/${active.id}`, { stage: newStage });
      toast.success(`Moved to ${newStage}`);
    } catch {
      toast.error("Update failed");
      load();
    }
  };

  return (
    <div className="space-y-6" data-testid="kanban-page">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1">Pipeline</div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Drag to move stages</h1>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-4 kanban-row">
          {STAGES.map((s) => <Column key={s} stage={s} leads={grouped[s] || []} />)}
        </div>
      </DndContext>
    </div>
  );
}
