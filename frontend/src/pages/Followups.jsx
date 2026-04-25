import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api, isOverdueDate } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { CheckCircle, Clock, WarningCircle, CalendarBlank, Bell } from "@phosphor-icons/react";
import { toast } from "sonner";

const TABS = [
  { key: "today", label: "Today", icon: CalendarBlank, color: "text-accent" },
  { key: "overdue", label: "Overdue", icon: WarningCircle, color: "text-destructive" },
  { key: "upcoming", label: "Upcoming", icon: Clock, color: "text-warning" },
  { key: "completed", label: "Completed", icon: CheckCircle, color: "text-success" },
];

export default function Followups() {
  const [params, setParams] = useSearchParams();
  const filter = params.get("filter") || "today";
  const [items, setItems] = useState([]);
  const [leads, setLeads] = useState([]);
  const [done, setDone] = useState(null); // followup id being completed
  const [nextDate, setNextDate] = useState("");
  const [nextNote, setNextNote] = useState("");

  const leadMap = useMemo(() => Object.fromEntries(leads.map((l) => [l.id, l])), [leads]);

  const load = async () => {
    const [a, b] = await Promise.all([
      api.get("/followups", { params: { filter } }),
      api.get("/leads"),
    ]);
    setItems(a.data); setLeads(b.data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const setFilter = (f) => setParams({ filter: f });

  const markDone = async (id, withNext) => {
    const body = { status: "Done" };
    if (withNext && nextDate) { body.next_due_at = nextDate; body.next_note = nextNote || ""; }
    try {
      await api.patch(`/followups/${id}`, body);
      toast.success(withNext ? "Done — next follow-up scheduled" : "Marked as Done");
      setDone(null); setNextDate(""); setNextNote("");
      load();
    } catch { toast.error("Failed"); }
  };

  const isOverdue = (f) => f.status === "Pending" && isOverdueDate(f.due_at);

  return (
    <div className="space-y-6" data-testid="followups-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1">Follow-ups</div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight flex items-center gap-2"><Bell size={26} weight="duotone" className="text-accent" /> Your tasks</h1>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setFilter(tb.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 ${filter === tb.key ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            data-testid={`tab-${tb.key}`}
          >
            <tb.icon size={16} className={filter === tb.key ? tb.color : ""} weight={filter === tb.key ? "fill" : "regular"} />
            {tb.label}
          </button>
        ))}
      </div>

      <Card className="bg-surface border-border shadow-none">
        <ul className="divide-y divide-border">
          {items.map((f) => {
            const lead = leadMap[f.lead_id];
            const overdue = isOverdue(f);
            return (
              <li key={f.id} className={`p-4 ${overdue ? "border-l-4 border-l-destructive" : ""}`} data-testid={`fu-row-${f.id}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {lead ? (
                        <Link to={`/app/leads/${lead.id}`} className="font-medium hover:text-accent">{lead.name}</Link>
                      ) : <span className="text-muted-foreground">(deleted lead)</span>}
                      {lead && <span className="text-xs text-muted-foreground">• {lead.mobile}</span>}
                      {overdue && <span className="text-[10px] uppercase tracking-wider font-bold text-destructive">Overdue</span>}
                    </div>
                    <div className="text-sm mt-1">{f.note || <span className="text-muted-foreground italic">No note</span>}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Due: {new Date(f.due_at).toLocaleString()} • Status: <span className={f.status === "Done" ? "text-success font-semibold" : "text-warning font-semibold"}>{f.status}</span>
                    </div>
                  </div>
                  {f.status === "Pending" && (
                    <div className="flex items-center gap-2">
                      {done === f.id ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Input type="datetime-local" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="h-9 w-52" placeholder="Next follow-up" data-testid={`next-date-${f.id}`} />
                          <Input value={nextNote} onChange={(e) => setNextNote(e.target.value)} className="h-9 w-44" placeholder="Next note (optional)" />
                          <Button size="sm" onClick={() => markDone(f.id, true)} disabled={!nextDate} data-testid={`save-next-${f.id}`}>Done + Schedule</Button>
                          <Button size="sm" variant="ghost" onClick={() => markDone(f.id, false)}>Just done</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setDone(null); setNextDate(""); setNextNote(""); }}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setDone(f.id)} data-testid={`mark-done-${f.id}`}><CheckCircle size={14} className="mr-1" />Mark Done</Button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
          {!items.length && (
            <li className="p-12 text-center text-muted-foreground text-sm">No {filter} follow-ups.</li>
          )}
        </ul>
      </Card>
      <div className="text-xs text-muted-foreground">{items.length} {filter} follow-up(s)</div>
    </div>
  );
}
