import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../contexts/AppContext";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Plus, Trash, ShieldCheck } from "@phosphor-icons/react";
import { toast } from "sonner";

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "sales_user", label: "Sales User" },
];

export default function Admin() {
  const { user } = useApp();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "Welcome@123", role: "sales_user" });
  const [limits, setLimits] = useState({ user_limit: 5, lead_limit: 1000, plan: "trial" });
  const [busy, setBusy] = useState(false);

  // Owner-only gate (defence in depth — backend also enforces 403)
  if (user && user.role !== "owner") return <Navigate to="/app" replace />;

  const load = async () => {
    const [a, b] = await Promise.all([api.get("/admin/overview"), api.get("/team")]);
    setOverview(a.data); setUsers(b.data);
    setLimits({
      user_limit: a.data.user_limit ?? 5,
      lead_limit: a.data.lead_limit ?? 1000,
      plan: a.data.plan ?? "trial",
    });
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const onAddUser = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/admin/users", form);
      toast.success("User added");
      setAddOpen(false);
      setForm({ full_name: "", email: "", password: "Welcome@123", role: "sales_user" });
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to add user");
    }
    setBusy(false);
  };

  const onRemoveUser = async (u) => {
    if (!window.confirm(`Remove ${u.full_name || u.email}?`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      toast.success("User removed");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    }
  };

  const saveLimits = async () => {
    try {
      await api.patch("/admin/limits", {
        user_limit: Number(limits.user_limit),
        lead_limit: Number(limits.lead_limit),
        plan: limits.plan,
      });
      toast.success("Limits updated");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    }
  };

  if (!overview) return <div className="text-muted-foreground">Loading…</div>;

  const usersAtLimit = overview.total_users >= overview.user_limit;
  const leadsAtLimit = overview.total_leads >= overview.lead_limit;

  return (
    <div className="space-y-6" data-testid="admin-page">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1">Admin Panel</div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight flex items-center gap-2">
          <ShieldCheck size={26} weight="duotone" className="text-accent" /> Workspace control
        </h1>
      </div>

      {/* Overview */}
      <Card className="p-6 bg-surface border-border shadow-none" data-testid="admin-overview">
        <div className="font-heading font-medium mb-4">Workspace Overview</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Company</div>
            <div className="font-semibold" data-testid="admin-company-name">{overview.company_name}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total users</div>
            <div className="font-semibold" data-testid="admin-total-users">{overview.total_users} / {overview.user_limit}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total leads</div>
            <div className="font-semibold" data-testid="admin-total-leads">{overview.total_leads} / {overview.lead_limit}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</div>
            <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded border ${overview.status === "Active" ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30" : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"}`} data-testid="admin-status">
              {overview.status}
            </span>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Created</div>
            <div className="font-semibold">{overview.created_at ? new Date(overview.created_at).toLocaleDateString() : "—"}</div>
          </div>
        </div>
        {(usersAtLimit || leadsAtLimit) && (
          <div className="mt-4 text-xs text-destructive border border-destructive/30 bg-destructive/5 rounded-md p-3" data-testid="admin-limit-warning">
            {usersAtLimit && <div>User limit reached — new users cannot be created until you raise the limit.</div>}
            {leadsAtLimit && <div>Lead limit reached — new leads (manual / webhook / import) will be blocked.</div>}
          </div>
        )}
      </Card>

      {/* Users */}
      <Card className="p-6 bg-surface border-border shadow-none" data-testid="admin-users-card">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="font-heading font-medium">Users</div>
            <p className="text-xs text-muted-foreground">Add or remove team members. Owner-only.</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button disabled={usersAtLimit} data-testid="admin-add-user-btn"><Plus size={14} className="mr-1" /> Add user</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add new user</DialogTitle></DialogHeader>
              <form onSubmit={onAddUser} className="space-y-3">
                <div><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} data-testid="admin-user-name" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="admin-user-email" /></div>
                  <div><Label>Password</Label><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="admin-user-password" /></div>
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger data-testid="admin-user-role"><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={busy} data-testid="admin-user-submit">{busy ? "Adding…" : "Add user"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border border-border rounded-md overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const roleLabel = u.role === "owner" ? "Owner" : "Sales";
                const isSelf = u.id === user?.id;
                const isOwner = u.role === "owner";
                return (
                  <tr key={u.id} className="border-b border-border last:border-0" data-testid={`admin-user-row-${u.id}`}>
                    <td className="py-3 px-4 font-medium">{u.full_name || "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${isOwner ? "bg-accent/10 text-accent border-accent/30" : "bg-muted text-muted-foreground border-border"}`}>{roleLabel}</span>
                      {isSelf && <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">you</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!isSelf && !isOwner && (
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onRemoveUser(u)} data-testid={`admin-remove-user-${u.id}`}>
                          <Trash size={14} />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!users.length && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No users.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Limits */}
      <Card className="p-6 bg-surface border-border shadow-none" data-testid="admin-limits-card">
        <div className="font-heading font-medium mb-1">Plan limits</div>
        <p className="text-xs text-muted-foreground mb-4">Caps the number of users and leads this workspace can hold.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label>Max users</Label>
            <Input type="number" min="1" value={limits.user_limit} onChange={(e) => setLimits({ ...limits, user_limit: e.target.value })} data-testid="admin-user-limit-input" />
          </div>
          <div>
            <Label>Max leads</Label>
            <Input type="number" min="0" value={limits.lead_limit} onChange={(e) => setLimits({ ...limits, lead_limit: e.target.value })} data-testid="admin-lead-limit-input" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={limits.plan} onValueChange={(v) => setLimits({ ...limits, plan: v })}>
              <SelectTrigger data-testid="admin-plan-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={saveLimits} data-testid="admin-save-limits-btn">Save limits</Button>
        </div>
      </Card>
    </div>
  );
}
