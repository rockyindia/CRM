import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Crown } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "../lib/api";

export default function Signup() {
  const { signup } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ company_name: "", full_name: "", email: "", password: "", phone: "" });
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signup(form);
      // seed demo data for new workspace
      try { await api.post("/demo/seed"); } catch {}
      toast.success("Workspace created with demo data!");
      navigate("/app");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Signup failed");
    }
    setBusy(false);
  };

  const u = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:block relative overflow-hidden border-r border-border bg-surface">
        <img src="https://static.prod-images.emergentagent.com/jobs/0c696bf0-771b-44e9-9db1-888a2340f89a/images/5290a49342d9ec498277425d06c7eb22cb3c406db8a63ba6d3960ca9ca0c45c9.png" className="w-full h-full object-cover opacity-90" alt="" />
        <div className="absolute top-8 left-8 flex items-center gap-2 font-heading font-bold text-lg text-white">
          <Crown weight="fill" size={22} /> LeadEmpire
        </div>
        <div className="absolute bottom-8 left-8 right-8 text-white">
          <div className="text-xs uppercase tracking-[0.2em] font-bold opacity-80 mb-2">14-day free trial</div>
          <div className="font-heading text-3xl font-semibold tracking-tight">Launch your sales workspace in 60 seconds.</div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 font-heading font-bold text-lg mb-8">
            <Crown weight="fill" className="text-accent" size={22} /> LeadEmpire
          </div>
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2">Get started</div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight mb-8">Create your workspace</h1>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>Company name</Label>
              <Input required value={form.company_name} onChange={u("company_name")} data-testid="signup-company-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Your name</Label>
                <Input required value={form.full_name} onChange={u("full_name")} data-testid="signup-name-input" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={u("phone")} data-testid="signup-phone-input" />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" required value={form.email} onChange={u("email")} data-testid="signup-email-input" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" required value={form.password} onChange={u("password")} data-testid="signup-password-input" />
            </div>
            <Button type="submit" className="w-full" disabled={busy} data-testid="signup-submit-btn">
              {busy ? "Creating…" : "Create workspace"}
            </Button>
          </form>
          <div className="mt-6 text-sm text-muted-foreground">
            Already onboarded? <Link to="/login" className="text-accent font-medium">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
