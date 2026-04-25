import React from "react";
import { useApp } from "../contexts/AppContext";
import { Card } from "../components/ui/card";
import { Check, Crown } from "@phosphor-icons/react";
import { Button } from "../components/ui/button";

const PLANS = [
  { key: "basic", name: "Basic", price: "₹999", users: "3 users", leads: "1,000 leads" },
  { key: "standard", name: "Standard", price: "₹2,499", users: "10 users", leads: "10,000 leads" },
  { key: "pro", name: "Pro", price: "₹4,999", users: "Unlimited", leads: "Unlimited" },
  { key: "enterprise", name: "Enterprise", price: "Custom", users: "Custom", leads: "Custom" },
];

export default function Settings() {
  const { user, workspace, theme, setTheme, lang, setLang } = useApp();
  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1">Settings</div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Workspace & billing</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-surface border-border shadow-none">
          <div className="font-heading font-medium mb-4">Workspace</div>
          <div className="space-y-3 text-sm">
            <div><div className="text-xs text-muted-foreground uppercase tracking-wider">Name</div>{workspace?.name}</div>
            <div><div className="text-xs text-muted-foreground uppercase tracking-wider">Plan</div><span className="capitalize font-semibold">{workspace?.plan}</span></div>
            <div><div className="text-xs text-muted-foreground uppercase tracking-wider">User limit</div>{workspace?.user_limit}</div>
            <div><div className="text-xs text-muted-foreground uppercase tracking-wider">Lead limit</div>{workspace?.lead_limit}</div>
          </div>
        </Card>
        <Card className="p-6 bg-surface border-border shadow-none">
          <div className="font-heading font-medium mb-4">Account</div>
          <div className="space-y-3 text-sm">
            <div><div className="text-xs text-muted-foreground uppercase tracking-wider">Name</div>{user?.full_name}</div>
            <div><div className="text-xs text-muted-foreground uppercase tracking-wider">Email</div>{user?.email}</div>
            <div><div className="text-xs text-muted-foreground uppercase tracking-wider">Role</div><span className="capitalize">{user?.role}</span></div>
          </div>
        </Card>
        <Card className="p-6 bg-surface border-border shadow-none">
          <div className="font-heading font-medium mb-4">Preferences</div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Theme</span>
              <div className="flex gap-1 border border-border rounded-md p-0.5">
                {["light", "dark"].map((m) => (
                  <button key={m} onClick={() => setTheme(m)} className={`px-3 py-1 text-xs rounded ${theme === m ? "bg-foreground text-background" : "text-muted-foreground"}`} data-testid={`theme-${m}-btn`}>{m}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Language</span>
              <div className="flex gap-1 border border-border rounded-md p-0.5">
                {["en", "hi"].map((m) => (
                  <button key={m} onClick={() => setLang(m)} className={`px-3 py-1 text-xs rounded ${lang === m ? "bg-foreground text-background" : "text-muted-foreground"}`}>{m.toUpperCase()}</button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-surface border-border shadow-none">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Billing</div>
            <div className="font-heading font-medium text-lg flex items-center gap-2"><Crown weight="fill" className="text-accent" size={18} /> Subscription Plans</div>
          </div>
          <span className="text-xs text-muted-foreground">Powered by Stripe (mock)</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((p) => (
            <div key={p.key} className={`border rounded-lg p-5 ${workspace?.plan === p.key ? "border-accent bg-background" : "border-border"}`}>
              <div className="font-heading font-semibold text-lg">{p.name}</div>
              <div className="font-heading text-2xl font-semibold mt-2">{p.price}<span className="text-xs text-muted-foreground">/mo</span></div>
              <div className="text-xs text-muted-foreground mt-1 mb-4">{p.users} • {p.leads}</div>
              <Button className="w-full" variant={workspace?.plan === p.key ? "outline" : "default"} disabled data-testid={`plan-${p.key}-btn`}>
                {workspace?.plan === p.key ? <><Check size={14} className="mr-1" /> Current</> : "Upgrade"}
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">Live Stripe checkout will be enabled in Phase 2 with switchable Razorpay support for India.</p>
      </Card>
    </div>
  );
}
