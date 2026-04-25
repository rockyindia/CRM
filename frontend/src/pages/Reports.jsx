import React, { useEffect, useState } from "react";
import { api, fmtINR } from "../lib/api";
import { Card } from "../components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

export default function Reports() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/dashboard/stats").then((r) => setStats(r.data)); }, []);
  if (!stats) return <div className="text-muted-foreground">Loading…</div>;

  const stageData = stats.stages.map((s) => ({ name: s.stage, count: s.count }));
  const sourceData = stats.sources.map((s) => ({ name: s.source, count: s.count }));

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1">Reports</div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Analytics & insights</h1>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: "Total Leads", v: stats.total_leads }, { l: "Booked", v: stats.booked },
          { l: "Lost", v: stats.lost }, { l: "Revenue", v: fmtINR(stats.revenue) },
        ].map((s) => (
          <div key={s.l} className="border border-border rounded-lg p-5 bg-surface">
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">{s.l}</div>
            <div className="font-heading text-3xl font-semibold mt-2">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-surface border-border shadow-none">
          <div className="font-heading font-medium mb-4">Stage breakdown</div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={70} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 bg-surface border-border shadow-none">
          <div className="font-heading font-medium mb-4">Source performance</div>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
