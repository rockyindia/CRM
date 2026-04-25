import React, { useEffect, useState } from "react";
import { useApp } from "../contexts/AppContext";
import { api, API } from "../lib/api";
import { Card } from "../components/ui/card";
import { Check, Crown, Copy, ArrowsClockwise, Upload, Plus, Trash, PencilSimple } from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";

const PLANS = [
  { key: "basic", name: "Basic", price: "₹999", users: "3 users", leads: "1,000 leads" },
  { key: "standard", name: "Standard", price: "₹2,499", users: "10 users", leads: "10,000 leads" },
  { key: "pro", name: "Pro", price: "₹4,999", users: "Unlimited", leads: "Unlimited" },
  { key: "enterprise", name: "Enterprise", price: "Custom", users: "Custom", leads: "Custom" },
];

function CopyField({ label, value, testid }) {
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); toast.success("Copied"); }
    catch { toast.error("Copy failed"); }
  };
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2 mt-1">
        <Input value={value} readOnly className="font-mono text-xs" data-testid={testid} />
        <Button type="button" size="sm" variant="outline" onClick={copy} data-testid={`${testid}-copy`}><Copy size={14} /></Button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { user, workspace: ctxWorkspace, theme, setTheme, lang, setLang } = useApp();
  const [ws, setWs] = useState(null);
  const [team, setTeam] = useState([]);
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [xlsxBase64, setXlsxBase64] = useState("");
  const [xlsxFileName, setXlsxFileName] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState(null);
  // Call status labels
  const [callStatuses, setCallStatuses] = useState([]);
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingLabel, setEditingLabel] = useState("");

  const load = async () => {
    const [a, b, c] = await Promise.all([
      api.get("/settings/workspace"),
      api.get("/team"),
      api.get("/call-statuses"),
    ]);
    setWs(a.data); setTeam(b.data); setCallStatuses(c.data);
  };
  useEffect(() => { load(); }, []);

  const reloadStatuses = async () => {
    const { data } = await api.get("/call-statuses");
    setCallStatuses(data);
  };

  const addLabel = async () => {
    const label = newLabel.trim();
    if (!label) return;
    try {
      await api.post("/call-statuses", { label });
      toast.success("Label added");
      setNewLabel("");
      await reloadStatuses();
    } catch (err) { toast.error(err?.response?.data?.detail || "Failed"); }
  };

  const startEdit = (s) => { setEditingId(s.id); setEditingLabel(s.label); };
  const cancelEdit = () => { setEditingId(null); setEditingLabel(""); };

  const saveEdit = async () => {
    const label = editingLabel.trim();
    if (!label) return;
    try {
      await api.patch(`/call-statuses/${editingId}`, { label });
      toast.success("Label updated");
      cancelEdit();
      await reloadStatuses();
    } catch (err) { toast.error(err?.response?.data?.detail || "Failed"); }
  };

  const deleteLabel = async (s) => {
    if (!window.confirm(`Delete label "${s.label}"?`)) return;
    try {
      await api.delete(`/call-statuses/${s.id}`);
      toast.success("Label deleted");
      await reloadStatuses();
    } catch (err) { toast.error(err?.response?.data?.detail || "Failed"); }
  };

  const setDefaultAssignee = async (id) => {
    const { data } = await api.patch("/settings/workspace", { default_assignee_id: id });
    setWs(data); toast.success("Default assignee updated");
  };

  const regenerateKey = async () => {
    if (!window.confirm("Regenerate API key? Old webhooks using this key will stop working.")) return;
    const { data } = await api.patch("/settings/workspace", { regenerate_api_key: true });
    setWs(data); toast.success("API key regenerated");
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isXlsx = /\.xlsx$/i.test(file.name);
    const reader = new FileReader();
    if (isXlsx) {
      reader.onload = () => {
        // ArrayBuffer -> base64 (chunked to avoid stack overflow on large files)
        const bytes = new Uint8Array(reader.result);
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        setXlsxBase64(btoa(binary));
        setXlsxFileName(file.name);
        setCsvText("");
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = () => {
        setCsvText(String(reader.result || ""));
        setXlsxBase64(""); setXlsxFileName("");
      };
      reader.readAsText(file);
    }
  };

  const onImport = async () => {
    setImportBusy(true); setImportResult(null);
    try {
      const body = xlsxBase64 ? { xlsx_base64: xlsxBase64 } : { csv_text: csvText };
      const { data } = await api.post("/leads/import", body);
      setImportResult(data);
      toast.success(`Imported: ${data.created} new, ${data.updated} updated`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Import failed");
    }
    setImportBusy(false);
  };

  const downloadTemplate = async (fmt) => {
    try {
      const { data } = await api.get(`/leads/import/template?format=${fmt}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `leadempire-import-template.${fmt}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch { toast.error("Could not download template"); }
  };

  if (!ws) return <div className="text-muted-foreground">Loading…</div>;

  const origin = window.location.origin;
  const webhookUrl = `${API}/webhooks/leads`;
  const formUrl = `${origin}/capture/${ws.form_token}`;

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1">Settings</div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Workspace, capture & billing</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-surface border-border shadow-none">
          <div className="font-heading font-medium mb-4">Workspace</div>
          <div className="space-y-3 text-sm">
            <div><div className="text-xs text-muted-foreground uppercase tracking-wider">Name</div>{ws.name}</div>
            <div><div className="text-xs text-muted-foreground uppercase tracking-wider">Plan</div><span className="capitalize font-semibold">{ws.plan}</span></div>
            <div><div className="text-xs text-muted-foreground uppercase tracking-wider">Limits</div>{ws.user_limit} users • {ws.lead_limit} leads</div>
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

      {/* Lead Capture */}
      <Card className="p-6 bg-surface border-border shadow-none" data-testid="capture-settings">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Lead Capture</div>
            <div className="font-heading font-medium text-lg">Webhook, public form & CSV</div>
          </div>
          <Button variant="outline" onClick={() => { setImportOpen(true); setImportResult(null); setCsvText(""); setXlsxBase64(""); setXlsxFileName(""); }} data-testid="import-csv-btn"><Upload size={14} className="mr-2" />Import CSV / Excel</Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="space-y-3">
            <CopyField label="Webhook URL (POST)" value={webhookUrl} testid="webhook-url" />
            <div>
              <Label>API Key (send as <code className="text-xs">x-api-key</code> header)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input value={ws.api_key || ""} readOnly className="font-mono text-xs" data-testid="api-key" />
                <Button type="button" size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(ws.api_key); toast.success("Copied"); }} data-testid="api-key-copy"><Copy size={14} /></Button>
                <Button type="button" size="sm" variant="outline" onClick={regenerateKey} title="Regenerate" data-testid="api-key-regen"><ArrowsClockwise size={14} /></Button>
              </div>
            </div>
            <div>
              <Label>Default assignee for captured leads</Label>
              <Select value={ws.default_assignee_id || ""} onValueChange={setDefaultAssignee}>
                <SelectTrigger data-testid="default-assignee-select"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name} ({m.role})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-3">
            <CopyField label="Public Form URL" value={formUrl} testid="form-url" />
            <a href={formUrl} target="_blank" rel="noreferrer" className="text-sm text-accent font-medium" data-testid="open-form-link">Open form in new tab →</a>
            <div className="border border-border rounded-md p-3 text-xs bg-background">
              <div className="font-semibold mb-1">Sample webhook payload</div>
              <pre className="text-muted-foreground whitespace-pre-wrap font-mono">{`POST ${webhookUrl}
Headers: x-api-key: <your key>

{
  "name": "Rohit Sharma",
  "mobile": "9876543210",
  "email": "rohit@example.com",
  "city": "Bangalore",
  "budget": 8500000,
  "project_interest": "Skyline Residences",
  "source": "Facebook",
  "message": "Interested in 3BHK"
}`}</pre>
            </div>
          </div>
        </div>
      </Card>

      {/* Call Status Labels */}
      <Card className="p-6 bg-surface border-border shadow-none" data-testid="call-statuses-settings">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Telecalling</div>
            <div className="font-heading font-medium text-lg">Call Status Labels</div>
            <p className="text-xs text-muted-foreground mt-1">
              Used in the Lead Detail call popup. {user?.role === "owner" ? "Add, edit or remove labels for your team." : "Only the owner can manage these."}
            </p>
          </div>
        </div>

        <ul className="divide-y divide-border border border-border rounded-md bg-background">
          {callStatuses.map((s) => {
            const isDefault = !!s.is_default;
            const isEditing = editingId === s.id;
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5" data-testid={`call-status-row-${s.id}`}>
                {isEditing ? (
                  <Input value={editingLabel} onChange={(e) => setEditingLabel(e.target.value)} className="h-8 max-w-xs" data-testid="call-status-edit-input" />
                ) : (
                  <span className="text-sm">
                    {s.label}
                    {isDefault && <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">default</span>}
                  </span>
                )}
                {user?.role === "owner" && !isDefault && (
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <Button size="sm" onClick={saveEdit} disabled={!editingLabel.trim()} data-testid="call-status-save-edit">Save</Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(s)} data-testid={`call-status-edit-${s.id}`}><PencilSimple size={14} /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteLabel(s)} data-testid={`call-status-delete-${s.id}`}><Trash size={14} /></Button>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
          {!callStatuses.length && (
            <li className="px-4 py-6 text-sm text-muted-foreground text-center">No labels.</li>
          )}
        </ul>

        {user?.role === "owner" && (
          <div className="flex items-center gap-2 mt-4">
            <Input
              placeholder="New label e.g. Answered Voicemail"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLabel(); } }}
              className="max-w-sm"
              data-testid="call-status-new-input"
            />
            <Button onClick={addLabel} disabled={!newLabel.trim()} data-testid="call-status-add-btn"><Plus size={14} className="mr-1" /> Add</Button>
          </div>
        )}
      </Card>

      {/* Plans */}
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
            <div key={p.key} className={`border rounded-lg p-5 ${ws.plan === p.key ? "border-accent bg-background" : "border-border"}`}>
              <div className="font-heading font-semibold text-lg">{p.name}</div>
              <div className="font-heading text-2xl font-semibold mt-2">{p.price}<span className="text-xs text-muted-foreground">/mo</span></div>
              <div className="text-xs text-muted-foreground mt-1 mb-4">{p.users} • {p.leads}</div>
              <Button className="w-full" variant={ws.plan === p.key ? "outline" : "default"} disabled data-testid={`plan-${p.key}-btn`}>
                {ws.plan === p.key ? <><Check size={14} className="mr-1" /> Current</> : "Upgrade"}
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">Live Stripe checkout will be enabled in Phase 2 with switchable Razorpay support for India.</p>
      </Card>

      {/* CSV/Excel Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Import leads from CSV or Excel</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Required columns: <code>name</code>, <code>mobile</code>. Optional:
              <code> email, city, budget, project_interest, source, message, assigned_user, next_followup_date, remarks</code>.
              Column names are case-insensitive. Date format: <code>YYYY-MM-DD</code>. Duplicates by mobile will be merged.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Sample:</span>
              <Button size="sm" variant="outline" onClick={() => downloadTemplate("csv")} data-testid="download-template-csv-btn">Download CSV</Button>
              <Button size="sm" variant="outline" onClick={() => downloadTemplate("xlsx")} data-testid="download-template-xlsx-btn">Download Excel</Button>
            </div>
            <Input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onFile} data-testid="csv-file-input" />
            {xlsxFileName && (
              <div className="text-xs text-muted-foreground" data-testid="xlsx-file-name">Selected Excel file: <span className="font-mono">{xlsxFileName}</span></div>
            )}
            {!xlsxBase64 && (
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={10}
                placeholder="name,mobile,email,city,budget,source,message&#10;Rohit Sharma,9876543210,rohit@example.com,Bangalore,8500000,Facebook,Wants 3BHK"
                className="w-full text-xs font-mono p-3 rounded-md border border-border bg-background"
                data-testid="csv-textarea"
              />
            )}
            {importResult && (
              <div className="text-sm border border-border rounded-md p-3" data-testid="import-result">
                <div className="font-semibold mb-1">Import summary</div>
                <div>
                  Total rows: <span className="font-semibold">{importResult.total_rows ?? (importResult.created + importResult.updated + importResult.errors)}</span>
                  {" "}• Created: <span className="text-success font-semibold">{importResult.created}</span>
                  {" "}• Updated: <span className="text-accent font-semibold">{importResult.updated}</span>
                  {" "}• Errors: <span className="text-destructive font-semibold">{importResult.errors}</span>
                </div>
                {importResult.error_rows?.length > 0 && (
                  <ul className="text-xs text-muted-foreground mt-2 list-disc pl-5">
                    {importResult.error_rows.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setImportOpen(false)}>Close</Button>
              <Button onClick={onImport} disabled={(!csvText.trim() && !xlsxBase64) || importBusy} data-testid="run-import-btn">{importBusy ? "Importing…" : "Import"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
