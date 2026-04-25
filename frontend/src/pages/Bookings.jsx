import React, { useEffect, useState } from "react";
import { api, fmtINR } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Receipt } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(null);
  const [form, setForm] = useState({ lead_id: "", project_id: "", unit_id: "", total_amount: "", token_amount: "", notes: "" });
  const [pay, setPay] = useState({ amount: "", method: "Bank Transfer", notes: "" });

  const load = async () => {
    const [a, b, c, d] = await Promise.all([api.get("/bookings"), api.get("/leads"), api.get("/projects"), api.get("/units")]);
    setBookings(a.data); setLeads(b.data); setProjects(c.data); setUnits(d.data);
  };
  useEffect(() => { load(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    await api.post("/bookings", {
      lead_id: form.lead_id, project_id: form.project_id || null, unit_id: form.unit_id || null,
      total_amount: Number(form.total_amount), token_amount: Number(form.token_amount) || 0, notes: form.notes,
    });
    toast.success("Booking created"); setOpen(false);
    setForm({ lead_id: "", project_id: "", unit_id: "", total_amount: "", token_amount: "", notes: "" });
    load();
  };

  const onAddPay = async (e) => {
    e.preventDefault();
    await api.post("/payments", { booking_id: payOpen, amount: Number(pay.amount), method: pay.method, notes: pay.notes });
    toast.success("Payment recorded"); setPayOpen(null); setPay({ amount: "", method: "Bank Transfer", notes: "" });
    load();
  };

  return (
    <div className="space-y-6" data-testid="bookings-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1">Bookings</div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Bookings & Payments</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="new-booking-btn"><Plus size={16} className="mr-1" />New Booking</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Booking</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-3">
              <div><Label>Lead</Label>
                <Select value={form.lead_id} onValueChange={(v) => setForm({ ...form, lead_id: v })}>
                  <SelectTrigger data-testid="booking-lead-select"><SelectValue placeholder="Select lead" /></SelectTrigger>
                  <SelectContent>{leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name} • {l.mobile}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Project</Label>
                  <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v, unit_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Unit</Label>
                  <Select value={form.unit_id} onValueChange={(v) => setForm({ ...form, unit_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{units.filter((u) => !form.project_id || u.project_id === form.project_id).map((u) => <SelectItem key={u.id} value={u.id}>{u.block ? `${u.block}-` : ""}{u.unit_no}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Total amount (₹)</Label><Input type="number" required value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} data-testid="booking-total-input" /></div>
                <div><Label>Token amount (₹)</Label><Input type="number" value={form.token_amount} onChange={(e) => setForm({ ...form, token_amount: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={!form.lead_id} data-testid="submit-booking-btn">Save</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-surface border-border shadow-none">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-3 px-4">Lead</th><th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Total</th><th className="py-3 px-4">Paid</th>
                <th className="py-3 px-4">Pending</th><th className="py-3 px-4">When</th><th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const lead = leads.find((l) => l.id === b.lead_id);
                const proj = projects.find((p) => p.id === b.project_id);
                const pending = (b.total_amount || 0) - (b.paid_amount || 0);
                return (
                  <tr key={b.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-4 font-medium">{lead?.name || "—"}</td>
                    <td className="py-3 px-4">{proj?.name || "—"}</td>
                    <td className="py-3 px-4">{fmtINR(b.total_amount)}</td>
                    <td className="py-3 px-4 text-success">{fmtINR(b.paid_amount)}</td>
                    <td className="py-3 px-4 text-warning">{fmtINR(pending)}</td>
                    <td className="py-3 px-4 text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4"><Button size="sm" variant="outline" onClick={() => setPayOpen(b.id)} data-testid={`add-payment-${b.id}`}>Add Payment</Button></td>
                  </tr>
                );
              })}
              {!bookings.length && <tr><td colSpan={7} className="py-12 text-center text-muted-foreground"><Receipt size={32} className="mx-auto mb-2 opacity-50" />No bookings yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!payOpen} onOpenChange={(v) => !v && setPayOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <form onSubmit={onAddPay} className="space-y-3">
            <div><Label>Amount (₹)</Label><Input type="number" required value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} data-testid="payment-amount-input" /></div>
            <div><Label>Method</Label>
              <Select value={pay.method} onValueChange={(v) => setPay({ ...pay, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Cash", "Bank Transfer", "UPI", "Cheque", "Card"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Input value={pay.notes} onChange={(e) => setPay({ ...pay, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setPayOpen(null)}>Cancel</Button><Button type="submit" data-testid="submit-payment-btn">Record</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
