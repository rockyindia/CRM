import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Crown } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/app");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:block relative overflow-hidden border-r border-border bg-surface">
        <img src="https://static.prod-images.emergentagent.com/jobs/0c696bf0-771b-44e9-9db1-888a2340f89a/images/5290a49342d9ec498277425d06c7eb22cb3c406db8a63ba6d3960ca9ca0c45c9.png" className="w-full h-full object-cover opacity-90" alt="" />
        <div className="absolute top-8 left-8 flex items-center gap-2 font-heading font-bold text-lg text-white">
          <Crown weight="fill" size={22} /> LeadEmpire
        </div>
        <div className="absolute bottom-8 left-8 right-8 text-white">
          <div className="text-xs uppercase tracking-[0.2em] font-bold opacity-80 mb-2">Real Estate CRM</div>
          <div className="font-heading text-3xl font-semibold tracking-tight">Convert more leads into bookings.</div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 font-heading font-bold text-lg mb-8">
            <Crown weight="fill" className="text-accent" size={22} /> LeadEmpire
          </div>
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2">Sign in</div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight mb-2">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-8">Manage your real estate pipeline.</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="login-email-input" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password-input" />
            </div>
            <Button type="submit" className="w-full" disabled={busy} data-testid="login-submit-btn">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <div className="mt-6 text-sm text-muted-foreground">
            New here? <Link to="/signup" className="text-accent font-medium">Create workspace</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
