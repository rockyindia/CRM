import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus } from "@phosphor-icons/react";
import { toast } from "sonner";

const ROLES = ["owner", "manager", "team_leader", "executive", "telecaller", "accountant", "viewer"];

export default function Team() {
  const [team, setTeam] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "Welcome@123", role: "executive" });

  const load = async () => { const { data } = await api.get("/team"); setTeam(data); };
  useEffect(() => { load(); }, []);

  const onAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post("/team", form);
      toast.success("Member added"); setOpen(false);
      setForm({ full_name: "", email: "", phone: "", password: "Welcome@123", role: "executive" });
      load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Failed"); }
  };

  return (
    <div className="space-y-6" data-testid="team-page">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1">Team</div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Members & roles</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="add-member-btn"><Plus size={16} className="mr-1" />Add Member</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add team member</DialogTitle></DialogHeader>
            <form onSubmit={onAdd} className="space-y-3">
              <div><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Password</Label><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" data-testid="submit-member-btn">Add</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-surface border-border shadow-none">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-3 px-4">Member</th><th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Phone</th><th className="py-3 px-4">Role</th><th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {team.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-accent text-accent-foreground grid place-items-center text-sm font-semibold">{m.full_name?.[0]?.toUpperCase()}</div>
                      <span className="font-medium">{m.full_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{m.email}</td>
                  <td className="py-3 px-4 text-muted-foreground">{m.phone || "—"}</td>
                  <td className="py-3 px-4 capitalize">{m.role}</td>
                  <td className="py-3 px-4"><span className={`text-xs font-semibold ${m.active ? "text-success" : "text-muted-foreground"}`}>{m.active ? "Active" : "Inactive"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
