import React from "react";
import { Link } from "react-router-dom";
import { Crown, Rocket, ChartLineUp, Phone, Buildings, Sparkle, ArrowRight, Check } from "@phosphor-icons/react";
import { Button } from "../components/ui/button";

const FEATURES = [
  { icon: ChartLineUp, title: "Smart Lead Pipeline", desc: "Drag-drop Kanban with 14 stages from New to Won." },
  { icon: Phone, title: "Telecalling CRM", desc: "Click-to-call, dispositions, call notes & duration tracking." },
  { icon: Buildings, title: "Real Estate Inventory", desc: "Manage projects, towers, blocks, units & availability." },
  { icon: Sparkle, title: "AI Lead Scoring", desc: "Claude-powered conversion likelihood & next best action." },
];

const PLANS = [
  { name: "Basic", price: "₹999", period: "/mo", users: "3 users", leads: "1,000 leads", features: ["Core CRM", "Pipeline", "Mobile App"] },
  { name: "Standard", price: "₹2,499", period: "/mo", users: "10 users", leads: "10,000 leads", features: ["Everything in Basic", "WhatsApp", "Reports", "Inventory"], popular: true },
  { name: "Pro", price: "₹4,999", period: "/mo", users: "Unlimited", leads: "Unlimited", features: ["Automation", "Telecalling", "AI Insights", "Site Visits"] },
  { name: "Enterprise", price: "Custom", period: "", users: "Custom", leads: "Custom", features: ["White Label", "Custom Domain", "API Access", "Dedicated Support"] },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 font-heading font-bold text-lg">
            <Crown weight="fill" className="text-accent" size={22} /> LeadEmpire
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" data-testid="landing-login-btn">Login</Button></Link>
            <Link to="/signup"><Button data-testid="landing-signup-btn">Start Free Trial</Button></Link>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 pt-20 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-6">
              <Rocket size={14} /> Built for real estate teams
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] mb-6">
              The CRM that turns site visits into <span className="text-accent">signed bookings.</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
              LeadEmpire unifies lead capture, telecalling, inventory, site visits & bookings in one premium workspace — with AI lead scoring out of the box.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/signup"><Button size="lg" data-testid="hero-cta-btn">Start 14-day free trial <ArrowRight size={16} className="ml-2" /></Button></Link>
              <Link to="/login"><Button size="lg" variant="outline">See live demo</Button></Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5"><Check size={16} className="text-success" /> No credit card</div>
              <div className="flex items-center gap-1.5"><Check size={16} className="text-success" /> Hindi + English</div>
              <div className="flex items-center gap-1.5"><Check size={16} className="text-success" /> White-label ready</div>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl border border-border bg-surface p-6 le-card-hover">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { l: "Total Leads", v: "1,248", c: "text-accent" },
                  { l: "Hot Leads", v: "37", c: "text-red-500" },
                  { l: "Conversion", v: "18.4%", c: "text-success" },
                ].map((s) => (
                  <div key={s.l} className="rounded-lg border border-border p-3 bg-background">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.l}</div>
                    <div className={`text-2xl font-heading font-semibold mt-1 ${s.c}`}>{s.v}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { n: "Rohit Sharma", s: "Hot", c: "text-red-500" },
                  { n: "Priya Mehta", s: "Interested", c: "text-violet-500" },
                  { n: "Amit Verma", s: "Site Visit Planned", c: "text-teal-500" },
                  { n: "Sneha Patel", s: "Booked", c: "text-green-500" },
                ].map((l) => (
                  <div key={l.n} className="flex items-center justify-between border border-border rounded-md p-3 bg-background">
                    <div className="font-medium">{l.n}</div>
                    <div className={`text-xs font-semibold ${l.c}`}>{l.s}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface border-y border-border py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-3">Everything in one place</div>
          <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight mb-12 max-w-2xl">A modern stack for builders, brokers & call-centres.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="border border-border rounded-lg p-6 bg-background le-card-hover">
                <f.icon size={28} weight="duotone" className="text-accent mb-4" />
                <div className="font-heading font-medium text-lg mb-2">{f.title}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-3">Pricing</div>
          <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight">Plans that scale with your sales team.</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((p) => (
            <div key={p.name} className={`border rounded-lg p-6 bg-background le-card-hover ${p.popular ? "border-accent" : "border-border"}`}>
              {p.popular && <div className="text-xs font-bold uppercase tracking-widest text-accent mb-2">Most Popular</div>}
              <div className="font-heading font-semibold text-xl mb-1">{p.name}</div>
              <div className="flex items-baseline gap-1 mb-4"><span className="text-3xl font-heading font-semibold">{p.price}</span><span className="text-muted-foreground text-sm">{p.period}</span></div>
              <div className="text-sm text-muted-foreground mb-4">{p.users} • {p.leads}</div>
              <ul className="space-y-2 mb-6">
                {p.features.map((f) => <li key={f} className="text-sm flex items-center gap-2"><Check size={14} className="text-success" /> {f}</li>)}
              </ul>
              <Link to="/signup"><Button className="w-full" variant={p.popular ? "default" : "outline"} data-testid={`plan-${p.name.toLowerCase()}-cta`}>Get started</Button></Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © 2026 LeadEmpire CRM. Built for real estate teams.
      </footer>
    </div>
  );
}
