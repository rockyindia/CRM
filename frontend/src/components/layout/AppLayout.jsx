import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import {
  House, UsersThree, Kanban, Buildings, Calendar, Receipt,
  ChartBar, Gear, Sun, Moon, SignOut, List, X, Translate, Crown, Bell, ShieldCheck
} from "@phosphor-icons/react";
import { Button } from "../ui/button";

const NAV = [
  { to: "/app", end: true, icon: House, key: "dashboard" },
  { to: "/app/leads", icon: UsersThree, key: "leads" },
  { to: "/app/pipeline", icon: Kanban, key: "pipeline" },
  { to: "/app/followups", icon: Bell, key: "followups" },
  { to: "/app/inventory", icon: Buildings, key: "inventory" },
  { to: "/app/site-visits", icon: Calendar, key: "siteVisits" },
  { to: "/app/bookings", icon: Receipt, key: "bookings" },
  { to: "/app/team", icon: UsersThree, key: "team" },
  { to: "/app/reports", icon: ChartBar, key: "reports" },
  { to: "/app/settings", icon: Gear, key: "settings" },
  { to: "/app/admin", icon: ShieldCheck, key: "admin", ownerOnly: true },
];

export default function AppLayout() {
  const { user, workspace, theme, setTheme, lang, setLang, logout, t, followupCounts } = useApp();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const fuBadge = (followupCounts?.today || 0) + (followupCounts?.overdue || 0);

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? "bg-surface-hover text-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
    }`;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside
        data-testid="app-sidebar"
        className={`fixed lg:sticky lg:top-0 z-40 h-screen w-64 bg-surface border-r border-border flex-col transition-transform ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } flex`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-border">
          <div className="flex items-center gap-2 font-heading font-bold text-lg">
            <Crown weight="fill" className="text-accent" size={22} />
            LeadEmpire
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden text-muted-foreground" data-testid="sidebar-close-btn">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {NAV.filter((n) => !n.ownerOnly || user?.role === "owner").map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={linkClass}
              data-testid={`nav-${n.key}`}
              onClick={() => setOpen(false)}
            >
              <n.icon size={18} weight="regular" />
              <span className="flex-1">{t(n.key)}</span>
              {n.key === "followups" && fuBadge > 0 && (
                <span
                  className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold grid place-items-center ${
                    (followupCounts?.overdue || 0) > 0
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-accent text-accent-foreground"
                  }`}
                  data-testid="nav-followups-badge"
                >
                  {fuBadge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-3 text-xs text-muted-foreground">
          <div className="font-medium text-foreground truncate">{workspace?.name}</div>
          <div className="uppercase tracking-wider mt-1">Plan: {workspace?.plan || "trial"}</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="lg:hidden" data-testid="sidebar-open-btn">
              <List size={22} />
            </button>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">CRM</div>
              <div className="font-heading font-semibold">{workspace?.name || "Workspace"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="h-9 px-3 rounded-md border border-border text-sm font-medium hover:bg-surface-hover flex items-center gap-1.5"
              data-testid="lang-toggle-btn"
            >
              <Translate size={16} /> {lang.toUpperCase()}
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9 rounded-md border border-border hover:bg-surface-hover grid place-items-center"
              data-testid="theme-toggle-btn"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
              <div className="h-8 w-8 rounded-full bg-accent text-accent-foreground grid place-items-center text-sm font-semibold">
                {user?.full_name?.[0]?.toUpperCase()}
              </div>
              <div className="text-xs">
                <div className="font-medium">{user?.full_name}</div>
                <div className="text-muted-foreground capitalize">{user?.role}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/login"); }} data-testid="logout-btn">
              <SignOut size={16} />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}
    </div>
  );
}
