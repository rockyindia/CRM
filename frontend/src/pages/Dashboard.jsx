import React, { useEffect, useState } from "react";
import { api, fmtINR, STAGE_COLORS } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { ChartLineUp, Fire, UsersThree, Receipt, Bell, Sparkle, ArrowRight, CalendarBlank, WarningCircle, Clock } from "@phosphor-icons/react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { toast } from "sonner";

const PIE_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#A855F7", "#06B6D4", "#EC4899"];

function StatCard({ icon: Icon, label, value, accent, testid }) {
  return (
    <div data-testid={testid} className="border border-border rounded-lg p-5 bg-surface le-card-hover">
      <div className="flex items-start justify-between">
        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{label}</div>
        <Icon size={18} className={accent || "text-muted-foreground"} weight="duotone" />
      </div>
      <div className="font-heading text-3xl font-semibold mt-3 tracking-tight">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useApp();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    const [s, l] = await Promise.all([
      api.get("/dashboard/stats"),
      api.get("/leads"),
    ]);
    setStats(s.data);
    setRecent(l.data.slice(0, 8));
  };

  useEffect(() => { load(); }, []);

  const seed = async () => {
    setSeeding(true);
    try {
      const { data } = await api.post("/demo/seed");
      if (data.seeded) toast.success("Demo data added"); else toast.info("Workspace already has data");
      await load();
    } catch (e) { toast.error("Seed failed"); }
    setSeeding(false);
  };

  if (!stats) return <div className="text-muted-foreground">Loading…</div>;

  const stageData = stats.stages.map((s) => ({ name: s.stage, count: s.count }));
  const sourceData = stats.sources.map((s) => ({ name: s.source, value: s.count }));

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1">{t("dashboard")}</div>
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight">Sales overview</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={seed} disabled={seeding} data-testid="seed-demo-btn">
            <Sparkle size={16} className="mr-2" />{seeding ? "Adding…" : "Add demo data"}
          </Button>
          <Link to="/app/leads"><Button data-testid="dash-new-lead-btn"><UsersThree size={16} className="mr-2" />{t("new_lead")}</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={UsersThree} label={t("total_leads")} value={stats.total_leads} accent="text-accent" testid="kpi-total-leads" />
        <StatCard icon={Fire} label={t("hot_leads")} value={stats.hot} accent="text-red-500" testid="kpi-hot" />
        <StatCard icon={ChartLineUp} label={t("conversion")} value={`${stats.conversion_pct}%`} accent="text-success" testid="kpi-conversion" />
        <StatCard icon={Receipt} label={t("revenue")} value={fmtINR(stats.revenue)} accent="text-success" testid="kpi-revenue" />
      </div>

      {/* Follow-up cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/app/followups?filter=today" data-testid="fu-card-today" className="border border-border rounded-lg p-5 bg-surface le-card-hover">
          <div className="flex items-start justify-between">
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Today's Follow-ups</div>
            <CalendarBlank size={18} weight="duotone" className="text-accent" />
          </div>
          <div className="font-heading text-3xl font-semibold mt-3 tracking-tight">{stats.followups_today ?? 0}</div>
          <div className="text-xs text-accent flex items-center gap-1 mt-2">View all <ArrowRight size={12} /></div>
        </Link>
        <Link to="/app/followups?filter=overdue" data-testid="fu-card-overdue" className={`border rounded-lg p-5 le-card-hover ${(stats.followups_overdue ?? 0) > 0 ? "border-destructive bg-destructive/5" : "border-border bg-surface"}`}>
          <div className="flex items-start justify-between">
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Overdue Follow-ups</div>
            <WarningCircle size={18} weight="duotone" className="text-destructive" />
          </div>
          <div className={`font-heading text-3xl font-semibold mt-3 tracking-tight ${(stats.followups_overdue ?? 0) > 0 ? "text-destructive" : ""}`}>
            {stats.followups_overdue ?? 0}
          </div>
          <div className="text-xs text-destructive flex items-center gap-1 mt-2">View all <ArrowRight size={12} /></div>
        </Link>
        <Link to="/app/followups?filter=upcoming" data-testid="fu-card-upcoming" className="border border-border rounded-lg p-5 bg-surface le-card-hover">
          <div className="flex items-start justify-between">
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Upcoming Follow-ups</div>
            <Clock size={18} weight="duotone" className="text-warning" />
          </div>
          <div className="font-heading text-3xl font-semibold mt-3 tracking-tight">{stats.followups_upcoming ?? 0}</div>
          <div className="text-xs text-accent flex items-center gap-1 mt-2">View all <ArrowRight size={12} /></div>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 bg-surface border-border shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Pipeline</div>
              <div className="font-heading font-medium text-lg">Leads by stage</div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 bg-surface border-border shadow-none">
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Channels</div>
          <div className="font-heading font-medium text-lg mb-4">Lead sources</div>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={sourceData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {sourceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-3">
            {sourceData.slice(0, 5).map((s, i) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />{s.name}</div>
                <span className="text-muted-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-surface border-border shadow-none">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Latest</div>
            <div className="font-heading font-medium text-lg">{t("recent_leads")}</div>
          </div>
          <Link to="/app/leads" className="text-sm text-accent flex items-center gap-1">View all <ArrowRight size={14} /></Link>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-3 pr-4">Name</th><th className="py-3 pr-4">Mobile</th>
                <th className="py-3 pr-4">{t("source")}</th><th className="py-3 pr-4">{t("budget")}</th>
                <th className="py-3 pr-4">{t("stage")}</th><th />
              </tr>
            </thead>
            <tbody>
              {recent.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="py-3 pr-4 font-medium">{l.name}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{l.mobile}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{l.source}</td>
                  <td className="py-3 pr-4">{fmtINR(l.budget)}</td>
                  <td className="py-3 pr-4"><span className={`px-2 py-0.5 text-xs font-semibold rounded border ${STAGE_COLORS[l.stage] || ""}`}>{l.stage}</span></td>
                  <td className="py-3"><Link to={`/app/leads/${l.id}`} className="text-accent text-xs font-semibold">Open</Link></td>
                </tr>
              ))}
              {!recent.length && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No leads yet. Add demo data to explore.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
