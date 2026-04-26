import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

const AppContext = createContext(null);

const TRANSLATIONS = {
  en: {
    dashboard: "Dashboard", leads: "Leads", pipeline: "Pipeline", inventory: "Inventory",
    siteVisits: "Site Visits", bookings: "Bookings", team: "Team", reports: "Reports",
    settings: "Settings", logout: "Logout", login: "Login", signup: "Sign up",
    admin: "Admin",
    followups: "Follow-ups",
    welcome: "Welcome back", email: "Email", password: "Password", company: "Company",
    fullName: "Full name", phone: "Phone", search: "Search", new_lead: "New Lead",
    add: "Add", save: "Save", cancel: "Cancel", delete: "Delete", call: "Call",
    notes: "Notes", status: "Status", source: "Source", stage: "Stage", priority: "Priority",
    budget: "Budget", city: "City", followup: "Followup", today: "Today",
    total_leads: "Total Leads", conversion: "Conversion", revenue: "Revenue", booked: "Booked",
    hot_leads: "Hot Leads", followups_pending: "Pending Followups", recent_leads: "Recent Leads",
    add_project: "Add Project", projects: "Projects", units: "Units",
    schedule_visit: "Schedule Visit", new_booking: "New Booking", payments: "Payments",
    ai_score: "AI Score", ai_next: "Next Action", ai_summary: "AI Summary",
    light: "Light", dark: "Dark", language: "Language",
  },
  hi: {
    dashboard: "डैशबोर्ड", leads: "लीड्स", pipeline: "पाइपलाइन", inventory: "इन्वेंटरी",
    siteVisits: "साइट विज़िट", bookings: "बुकिंग्स", team: "टीम", reports: "रिपोर्ट्स",
    settings: "सेटिंग्स", logout: "लॉग आउट", login: "लॉग इन", signup: "साइन अप",
    admin: "एडमिन",
    followups: "फ़ॉलो-अप",
    welcome: "वापसी पर स्वागत है", email: "ईमेल", password: "पासवर्ड", company: "कंपनी",
    fullName: "पूरा नाम", phone: "फ़ोन", search: "खोजें", new_lead: "नई लीड",
    add: "जोड़ें", save: "सहेजें", cancel: "रद्द", delete: "हटाएँ", call: "कॉल",
    notes: "नोट्स", status: "स्थिति", source: "स्रोत", stage: "चरण", priority: "प्राथमिकता",
    budget: "बजट", city: "शहर", followup: "फ़ॉलोअप", today: "आज",
    total_leads: "कुल लीड्स", conversion: "रूपांतरण", revenue: "राजस्व", booked: "बुक",
    hot_leads: "हॉट लीड्स", followups_pending: "लंबित फ़ॉलोअप", recent_leads: "हाल की लीड्स",
    add_project: "प्रोजेक्ट जोड़ें", projects: "प्रोजेक्ट्स", units: "यूनिट्स",
    schedule_visit: "विज़िट तय करें", new_booking: "नई बुकिंग", payments: "भुगतान",
    ai_score: "AI स्कोर", ai_next: "अगला कदम", ai_summary: "AI सारांश",
    light: "लाइट", dark: "डार्क", language: "भाषा",
  },
};

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("le_theme") || "light");
  const [lang, setLang] = useState(() => localStorage.getItem("le_lang") || "en");
  // In-app reminder counts (today + overdue) used by the Follow-ups sidebar badge.
  // Backend already scopes counts by role: owner sees workspace-wide, others see only their own.
  const [followupCounts, setFollowupCounts] = useState({ today: 0, overdue: 0, upcoming: 0 });

  const t = useCallback((k) => TRANSLATIONS[lang]?.[k] || TRANSLATIONS.en[k] || k, [lang]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("le_theme", theme);
  }, [theme]);

  useEffect(() => { localStorage.setItem("le_lang", lang); }, [lang]);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("le_token");
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user); setWorkspace(data.workspace);
    } catch { localStorage.removeItem("le_token"); }
    setLoading(false);
  }, []);

  // Pull pending-followup counts from the existing dashboard stats (role-scoped on the server).
  const refreshFollowupCounts = useCallback(async () => {
    const token = localStorage.getItem("le_token");
    if (!token) return;
    try {
      const { data } = await api.get("/dashboard/stats");
      setFollowupCounts({
        today: data.followups_today ?? 0,
        overdue: data.followups_overdue ?? 0,
        upcoming: data.followups_upcoming ?? 0,
      });
    } catch { /* silent — non-critical */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (user) refreshFollowupCounts();
    else setFollowupCounts({ today: 0, overdue: 0, upcoming: 0 });
  }, [user, refreshFollowupCounts]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("le_token", data.token);
    setUser(data.user); setWorkspace(data.workspace);
    return data;
  };

  const signup = async (payload) => {
    const { data } = await api.post("/auth/signup", payload);
    localStorage.setItem("le_token", data.token);
    setUser(data.user); setWorkspace(data.workspace);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("le_token");
    setUser(null); setWorkspace(null);
    setFollowupCounts({ today: 0, overdue: 0, upcoming: 0 });
    try { sessionStorage.removeItem("le_fu_reminder_shown"); } catch { /* ignore */ }
  };

  return (
    <AppContext.Provider value={{ user, workspace, loading, login, signup, logout, theme, setTheme, lang, setLang, t, refresh, followupCounts, refreshFollowupCounts }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
