import React, { useEffect, useState } from "react";
import { api, fmtINR } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Buildings, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

const STATUSES = ["Available", "Hold", "Sold"];

export default function Inventory() {
  const [projects, setProjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [active, setActive] = useState(null);
  const [pOpen, setPOpen] = useState(false);
  const [uOpen, setUOpen] = useState(false);
  const [pf, setPf] = useState({ name: "", builder: "", location: "", description: "" });
  const [uf, setUf] = useState({ block: "", unit_no: "", size_sqft: "", facing: "", price: "", status: "Available" });

  const loadProjects = async () => {
    const { data } = await api.get("/projects");
    setProjects(data);
    if (!active && data.length) setActive(data[0]);
  };
  const loadUnits = async (pid) => {
    const { data } = await api.get("/units", { params: { project_id: pid } });
    setUnits(data);
  };
  useEffect(() => { loadProjects(); }, []);
  useEffect(() => { if (active) loadUnits(active.id); }, [active]);

  const onCreateProject = async (e) => {
    e.preventDefault();
    await api.post("/projects", pf);
    setPf({ name: "", builder: "", location: "", description: "" });
    setPOpen(false); toast.success("Project added");
    loadProjects();
  };
  const onCreateUnit = async (e) => {
    e.preventDefault();
    await api.post("/units", { ...uf, project_id: active.id, size_sqft: Number(uf.size_sqft) || null, price: Number(uf.price) || null });
    setUf({ block: "", unit_no: "", size_sqft: "", facing: "", price: "", status: "Available" });
    setUOpen(false); toast.success("Unit added");
    loadUnits(active.id);
  };
  const updateUnitStatus = async (id, status) => {
    await api.patch(`/units/${id}`, { status });
    loadUnits(active.id);
  };
  const deleteProject = async (id) => {
    if (!window.confirm("Delete this project and all its units?")) return;
    await api.delete(`/projects/${id}`);
    setActive(null); loadProjects();
  };

  return (
    <div className="space-y-6" data-testid="inventory-page">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1">Inventory</div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Projects & Units</h1>
        </div>
        <Dialog open={pOpen} onOpenChange={setPOpen}>
          <DialogTrigger asChild><Button data-testid="add-project-btn"><Plus size={16} className="mr-1" />Add Project</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
            <form onSubmit={onCreateProject} className="space-y-3">
              <div><Label>Name</Label><Input required value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} data-testid="project-name-input" /></div>
              <div><Label>Builder</Label><Input value={pf.builder} onChange={(e) => setPf({ ...pf, builder: e.target.value })} /></div>
              <div><Label>Location</Label><Input value={pf.location} onChange={(e) => setPf({ ...pf, location: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={pf.description} onChange={(e) => setPf({ ...pf, description: e.target.value })} /></div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setPOpen(false)}>Cancel</Button><Button type="submit" data-testid="submit-project-btn">Save</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="space-y-2 lg:col-span-1">
          {projects.map((p) => (
            <button key={p.id} onClick={() => setActive(p)} className={`w-full text-left border rounded-lg p-4 ${active?.id === p.id ? "border-accent bg-surface" : "border-border hover:bg-surface-hover"}`} data-testid={`project-card-${p.id}`}>
              <div className="flex items-center gap-2 mb-1"><Buildings size={16} className="text-accent" /><span className="font-medium text-sm">{p.name}</span></div>
              <div className="text-xs text-muted-foreground">{p.location || "—"}</div>
            </button>
          ))}
          {!projects.length && <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
            <img src="https://static.prod-images.emergentagent.com/jobs/0c696bf0-771b-44e9-9db1-888a2340f89a/images/81c000cc375512ecaa21c51f2b1d7f8d4c773d8294307ca98c9f1c7e03fcafee.png" alt="" className="mx-auto h-32 mb-3 opacity-80" />
            No projects yet
          </div>}
        </div>

        <div className="lg:col-span-3">
          {active ? (
            <Card className="p-6 bg-surface border-border shadow-none">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-heading text-xl font-semibold">{active.name}</div>
                  <div className="text-sm text-muted-foreground">{active.builder} • {active.location}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={uOpen} onOpenChange={setUOpen}>
                    <DialogTrigger asChild><Button size="sm" data-testid="add-unit-btn"><Plus size={14} className="mr-1" />Add Unit</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>New Unit</DialogTitle></DialogHeader>
                      <form onSubmit={onCreateUnit} className="grid grid-cols-2 gap-3">
                        <div><Label>Block/Tower</Label><Input value={uf.block} onChange={(e) => setUf({ ...uf, block: e.target.value })} /></div>
                        <div><Label>Unit no.</Label><Input required value={uf.unit_no} onChange={(e) => setUf({ ...uf, unit_no: e.target.value })} data-testid="unit-no-input" /></div>
                        <div><Label>Size (sqft)</Label><Input type="number" value={uf.size_sqft} onChange={(e) => setUf({ ...uf, size_sqft: e.target.value })} /></div>
                        <div><Label>Facing</Label><Input value={uf.facing} onChange={(e) => setUf({ ...uf, facing: e.target.value })} /></div>
                        <div><Label>Price</Label><Input type="number" value={uf.price} onChange={(e) => setUf({ ...uf, price: e.target.value })} /></div>
                        <div><Label>Status</Label>
                          <Select value={uf.status} onValueChange={(v) => setUf({ ...uf, status: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setUOpen(false)}>Cancel</Button><Button type="submit" data-testid="submit-unit-btn">Save</Button></div>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="ghost" onClick={() => deleteProject(active.id)}><Trash size={14} /></Button>
                </div>
              </div>

              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                      <th className="py-2 px-3">Block</th><th className="py-2 px-3">Unit</th><th className="py-2 px-3">Size</th>
                      <th className="py-2 px-3">Facing</th><th className="py-2 px-3">Price</th><th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((u) => (
                      <tr key={u.id} className="border-b border-border last:border-0">
                        <td className="py-2 px-3">{u.block || "—"}</td>
                        <td className="py-2 px-3 font-medium">{u.unit_no}</td>
                        <td className="py-2 px-3">{u.size_sqft || "—"}</td>
                        <td className="py-2 px-3">{u.facing || "—"}</td>
                        <td className="py-2 px-3">{fmtINR(u.price)}</td>
                        <td className="py-2 px-3">
                          <Select value={u.status} onValueChange={(v) => updateUnitStatus(u.id, v)}>
                            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                    {!units.length && <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No units yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground">Select or create a project to manage units.</div>
          )}
        </div>
      </div>
    </div>
  );
}
