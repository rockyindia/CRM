import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Crown, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";

const SOURCES = ["Website", "Facebook", "Google", "WordPress", "99acres", "MagicBricks", "Housing", "Other"];
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PublicCaptureForm() {
  const { token } = useParams();
  const [meta, setMeta] = useState(null);
  const [form, setForm] = useState({ name: "", mobile: "", email: "", city: "", budget: "", project_interest: "", source: "Website", message: "" });
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    axios.get(`${API}/public/forms/${token}`).then((r) => setMeta(r.data)).catch(() => setMeta({ error: true }));
  }, [token]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await axios.post(`${API}/public/forms/${token}/leads`, form);
      setDone(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Submission failed");
    }
    setBusy(false);
  };

  if (!meta) return <div className="min-h-screen grid place-items-center text-muted-foreground bg-background">Loading…</div>;
  if (meta.error) return <div className="min-h-screen grid place-items-center bg-background"><div className="text-center"><div className="font-heading text-2xl mb-2">Form not found</div><div className="text-sm text-muted-foreground">This capture link is invalid or has been disabled.</div></div></div>;

  return (
    <div className="min-h-screen bg-surface flex items-start sm:items-center justify-center p-4 sm:p-8" data-testid="public-form-page">
      <div className="w-full max-w-md bg-background border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 font-heading font-bold text-lg mb-6"><Crown weight="fill" className="text-accent" size={22} /> {meta.workspace_name}</div>
        {done ? (
          <div className="text-center py-10" data-testid="form-success">
            <CheckCircle size={48} weight="duotone" className="mx-auto text-success mb-3" />
            <div className="font-heading text-2xl font-semibold mb-2">Thank you!</div>
            <div className="text-sm text-muted-foreground mb-6">Our team will reach out shortly.</div>
            <Button variant="outline" onClick={() => { setDone(false); setForm({ name: "", mobile: "", email: "", city: "", budget: "", project_interest: "", source: "Website", message: "" }); }}>Submit another</Button>
          </div>
        ) : (
          <>
            <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2">Enquire now</div>
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight mb-6">Tell us what you're looking for.</h1>
            <form onSubmit={onSubmit} className="space-y-3">
              <div><Label>Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="pf-name" /></div>
              <div><Label>Mobile *</Label><Input required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} data-testid="pf-mobile" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Budget (₹)</Label><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
                <div>
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Project of interest</Label><Input value={form.project_interest} onChange={(e) => setForm({ ...form, project_interest: e.target.value })} /></div>
              <div><Label>Message</Label><Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} data-testid="pf-message" /></div>
              <Button type="submit" className="w-full" disabled={busy} data-testid="pf-submit">{busy ? "Submitting…" : "Submit enquiry"}</Button>
            </form>
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground text-center mt-6">Powered by LeadEmpire CRM</div>
          </>
        )}
      </div>
    </div>
  );
}
