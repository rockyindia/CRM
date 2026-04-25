import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("le_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const fmtINR = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${Number(n).toLocaleString("en-IN")}`;
};

export const STAGES = [
  "New", "Fresh", "Attempted", "Connected", "Interested",
  "Hot", "Warm", "Cold", "Site Visit Planned", "Site Visit Done",
  "Negotiation", "Booked", "Won", "Lost",
];

export const STAGE_COLORS = {
  New: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  Fresh: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
  Attempted: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  Connected: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  Interested: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
  Hot: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  Warm: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  Cold: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
  "Site Visit Planned": "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30",
  "Site Visit Done": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  Negotiation: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30",
  Booked: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
  Won: "bg-green-600/15 text-green-700 dark:text-green-400 border-green-600/40",
  Lost: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30",
};

export const SOURCES = [
  "Facebook Ads", "Instagram", "Website", "Walk-in", "Reference", "Google Ads",
  "Facebook", "Google", "WordPress", "99acres", "MagicBricks", "Housing", "Manual", "Other",
];
