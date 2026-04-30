// src/portals/BillingPortal.jsx
// Self-contained billing portal.
// Manages its own data — only shares the supabase client and auth session with the rest of the app.
// Access: admin + account_manager roles only (enforced server-side; gated client-side via can("billing")).

import { useState, useEffect, useCallback, useRef } from "react";
import { SANS, MONO, C, INPUT, LABEL, ghostBtn, primaryBtn, dangerBtn, PAGE_HEADER, PAGE_TITLE } from "../theme";
import { supabase } from "../supabase";
import { useApp } from "../AppContext";
import AppDialog from "../components/AppDialog";
import Skeleton from "../components/Skeleton";

function InvoiceRowSkeleton() {
  return (
    <tr style={{ borderBottom: "1px solid #111" }}>
      <td style={{ padding: "14px 16px 14px 0" }}><Skeleton width={70} height={12} /></td>
      <td style={{ padding: "14px 16px 14px 0" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Skeleton width={130} height={11} />
          <Skeleton width={90} height={9} />
        </div>
      </td>
      <td style={{ padding: "14px 16px 14px 0" }}><Skeleton width={70} height={10} /></td>
      <td style={{ padding: "14px 16px 14px 0" }}><Skeleton width={70} height={10} /></td>
      <td style={{ padding: "14px 16px 14px 0" }}><Skeleton width={60} height={12} /></td>
      <td style={{ padding: "14px 16px 14px 0" }}><Skeleton width={60} height={18} radius={20} /></td>
      <td style={{ padding: "14px 0" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <Skeleton width={50} height={20} radius={20} />
          <Skeleton width={70} height={20} radius={20} />
        </div>
      </td>
    </tr>
  );
}

function ClientCardSkeleton() {
  return (
    <div style={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
      <Skeleton width="55%" height={14} />
      <Skeleton width="35%" height={10} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
        <Skeleton width="80%" height={9} />
        <Skeleton width="60%" height={9} />
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
        <Skeleton width={70} height={16} radius={20} />
        <Skeleton width={92} height={16} radius={20} />
      </div>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  draft:     { bg: "#2a2a2a", color: "#888",    label: "Draft" },
  sent:      { bg: "#1e3a5f", color: "#3B82F6", label: "Sent" },
  viewed:    { bg: "#2d1f5e", color: "#8B5CF6", label: "Viewed" },
  paid:      { bg: "#1a2e0a", color: "#CCFF00", label: "Paid" },
  overdue:   { bg: "#3a0a0a", color: "#E8001C", label: "Overdue" },
  cancelled: { bg: "#222",    color: "#555",    label: "Cancelled" },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", whiteSpace: "nowrap", lineHeight: 1, fontFamily: "'Space Mono', monospace" }}>
      {s.label}
    </span>
  );
}

// ── Currency formatter ────────────────────────────────────────────────────────
function fmt(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount ?? 0);
}

// ── Date formatter ────────────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Empty line item ───────────────────────────────────────────────────────────
function emptyLine() {
  return { _id: Math.random(), description: "", quantity: 1, unit_price: "" };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function BillingPortal({ setActivePortal }) {
  const { showToast } = useApp();
  const [tab, setTab] = useState("invoices");
  const [token, setToken] = useState(null);
  const [markPaidConfirm, setMarkPaidConfirm] = useState(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [clients, setClients]   = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loadingC, setLoadingC] = useState(true);
  const [loadingI, setLoadingI] = useState(true);
  const [apiError, setApiError] = useState("");

  // ── Client form ───────────────────────────────────────────────────────────
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null); // null = new, object = editing
  const [clientForm, setClientForm] = useState({ name: "", email: "", phone: "", company: "" });
  const [savingClient, setSavingClient] = useState(false);
  const [clientError, setClientError] = useState("");

  // ── Sync state ────────────────────────────────────────────────────────────
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [invoiceSyncing, setInvoiceSyncing] = useState(false);
  const [invoiceSyncResult, setInvoiceSyncResult] = useState(null);
  const [syncCooldown, setSyncCooldown] = useState(false);
  const syncCooldownTimer = useRef(null);

  // ── Invoice form ──────────────────────────────────────────────────────────
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    client_id: "",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: "",
    notes: "",
    tax_rate: 0,
    is_recurring: false,
    recurrence_rule: "monthly",
  });
  const [lineItems, setLineItems] = useState([emptyLine()]);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");

  // ── SMS opt-in ────────────────────────────────────────────────────────────
  const [optinSending, setOptinSending] = useState(null); // client id currently sending

  // ── Send modal ────────────────────────────────────────────────────────────
  const [sendModal, setSendModal]     = useState(null); // invoice object
  const [sendMethod, setSendMethod]   = useState("email");
  const [sending, setSending]         = useState(false);
  const [sendError, setSendError]     = useState("");
  const [sendSuccess, setSendSuccess] = useState("");

  // ── Get session token ─────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? null);
    });
  }, []);

  // ── API helpers ───────────────────────────────────────────────────────────
  const apiFetch = useCallback(async (path, opts = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const t = session?.access_token;
    const res = await fetch(path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${t}`,
        ...(opts.headers ?? {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    return body;
  }, []);

  const loadClients = useCallback(async () => {
    setLoadingC(true);
    try {
      const data = await apiFetch("/api/billing/clients");
      setClients(Array.isArray(data) ? data : []);
    } catch (e) {
      setApiError(e.message);
    } finally {
      setLoadingC(false);
    }
  }, [apiFetch]);

  const loadInvoices = useCallback(async () => {
    setLoadingI(true);
    try {
      const data = await apiFetch("/api/billing/invoices");
      setInvoices(Array.isArray(data) ? data : []);
    } catch (e) {
      setApiError(e.message);
    } finally {
      setLoadingI(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadClients();
    loadInvoices();
  }, [loadClients, loadInvoices]);

  // ── Client CRUD ───────────────────────────────────────────────────────────
  function openNewClient() {
    setEditingClient(null);
    setClientForm({ name: "", email: "", phone: "", company: "" });
    setClientError("");
    setShowClientForm(true);
  }

  function openEditClient(client) {
    setEditingClient(client);
    setClientForm({ name: client.name ?? "", email: client.email ?? "", phone: client.phone ?? "", company: client.company ?? "" });
    setClientError("");
    setShowClientForm(true);
  }

  async function submitClient(e) {
    e.preventDefault();
    setClientError("");
    if (!clientForm.name.trim() && !clientForm.company.trim()) return setClientError("Name or company is required.");
    setSavingClient(true);
    try {
      if (editingClient) {
        await apiFetch(`/api/billing/clients?id=${editingClient.id}`, {
          method: "PATCH",
          body: JSON.stringify(clientForm),
        });
      } else {
        await apiFetch("/api/billing/clients", {
          method: "POST",
          body: JSON.stringify(clientForm),
        });
      }
      setClientForm({ name: "", email: "", phone: "", company: "" });
      setEditingClient(null);
      setShowClientForm(false);
      await loadClients();
    } catch (err) {
      setClientError(err.message);
    } finally {
      setSavingClient(false);
    }
  }

  function startSyncCooldown() {
    setSyncCooldown(true);
    clearTimeout(syncCooldownTimer.current);
    syncCooldownTimer.current = setTimeout(() => setSyncCooldown(false), 60_000);
  }

  async function syncFromFreshbooks() {
    setSyncing(true);
    setSyncResult(null);
    startSyncCooldown();
    try {
      const result = await apiFetch("/api/billing/sync-clients");
      setSyncResult(result);
      await loadClients();
    } catch (err) {
      setSyncResult({ error: err.message });
    } finally {
      setSyncing(false);
    }
  }

  async function sendSmsOptin(clientId) {
    setOptinSending(clientId);
    try {
      await apiFetch("/api/billing/sms-optin", { method: "POST", body: JSON.stringify({ client_id: clientId }) });
      await loadClients();
    } catch (e) {
      showToast("Failed to send opt-in email: " + e.message, "error");
    } finally {
      setOptinSending(null);
    }
  }

  async function syncInvoicesFromFreshbooks() {
    setInvoiceSyncing(true);
    setInvoiceSyncResult(null);
    startSyncCooldown();
    try {
      const result = await apiFetch("/api/billing/sync-invoices", { method: "POST" });
      setInvoiceSyncResult(result);
      await loadInvoices();
    } catch (err) {
      setInvoiceSyncResult({ error: err.message });
    } finally {
      setInvoiceSyncing(false);
    }
  }

  // ── Invoice CRUD ──────────────────────────────────────────────────────────
  function lineSubtotal(item) {
    return Number(item.quantity || 1) * Number(item.unit_price || 0);
  }
  function invoiceSubtotal() {
    return lineItems.reduce((s, li) => s + lineSubtotal(li), 0);
  }
  function invoiceTotal() {
    const sub = invoiceSubtotal();
    return sub + (sub * Number(invoiceForm.tax_rate || 0)) / 100;
  }

  async function submitInvoice(e) {
    e.preventDefault();
    setInvoiceError("");
    if (!invoiceForm.client_id) return setInvoiceError("Select a client.");
    if (!invoiceForm.due_date) return setInvoiceError("Due date is required.");
    if (lineItems.some(li => !li.description.trim() || !li.unit_price)) {
      return setInvoiceError("All line items need a description and price.");
    }
    setSavingInvoice(true);
    try {
      await apiFetch("/api/billing/invoices", {
        method: "POST",
        body: JSON.stringify({
          client_id: invoiceForm.client_id,
          issue_date: invoiceForm.issue_date,
          due_date: invoiceForm.due_date,
          notes: invoiceForm.notes || undefined,
          tax_rate: Number(invoiceForm.tax_rate || 0),
          is_recurring: invoiceForm.is_recurring,
          recurrence_rule: invoiceForm.is_recurring ? invoiceForm.recurrence_rule : null,
          line_items: lineItems.map((li, i) => ({
            description: li.description.trim(),
            quantity: Number(li.quantity || 1),
            unit_price: Number(li.unit_price),
            sort_order: i,
          })),
        }),
      });
      setShowInvoiceForm(false);
      setLineItems([emptyLine()]);
      setInvoiceForm({
        client_id: "",
        issue_date: new Date().toISOString().split("T")[0],
        due_date: "",
        notes: "",
        tax_rate: 0,
        is_recurring: false,
        recurrence_rule: "monthly",
      });
      await loadInvoices();
    } catch (err) {
      setInvoiceError(err.message);
    } finally {
      setSavingInvoice(false);
    }
  }

  function markPaid(invoice) {
    setMarkPaidConfirm(invoice);
  }

  async function confirmMarkPaid(invoice) {
    try {
      await apiFetch(`/api/billing/invoices/${invoice.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "paid" }),
      });
      await loadInvoices();
    } catch (err) {
      showToast("Failed: " + err.message, "error");
    } finally {
      setMarkPaidConfirm(null);
    }
  }

  // ── Send invoice ──────────────────────────────────────────────────────────
  async function sendInvoice() {
    setSendError(""); setSendSuccess(""); setSending(true);
    try {
      const result = await apiFetch("/api/billing/send-invoice", {
        method: "POST",
        body: JSON.stringify({ invoiceId: sendModal.id, method: sendMethod }),
      });
      const warnings = result.warnings ?? [];
      if (warnings.length > 0) {
        setSendSuccess(`Partial send — ${warnings.join("; ")}`);
      } else {
        setSendSuccess(`Invoice sent via ${sendMethod === "both" ? "email & SMS" : sendMethod}!`);
      }
      await loadInvoices();
      setTimeout(() => { setSendModal(null); setSendSuccess(""); }, 3000);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  }

  // ── Line item helpers ─────────────────────────────────────────────────────
  function updateLine(id, field, value) {
    setLineItems(prev => prev.map(li => li._id === id ? { ...li, [field]: value } : li));
  }
  function removeLine(id) {
    setLineItems(prev => prev.length > 1 ? prev.filter(li => li._id !== id) : prev);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: C.canvas, color: C.text, fontFamily: SANS }}>

      {/* ── Header ── */}
      <div style={PAGE_HEADER}>
        <div style={PAGE_TITLE}>Billing</div>
      </div>

      {/* ── Tabs + actions ── */}
      <div style={{ background: C.canvas, borderBottom: `1px solid ${C.border}`, padding: "0 44px", display: "flex", alignItems: "center", gap: 0 }}>
        {["invoices", "clients"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", borderBottom: tab === t ? `2px solid ${C.accent}` : "2px solid transparent", color: tab === t ? C.text : C.meta, fontWeight: tab === t ? 700 : 500, fontSize: 13, fontFamily: SANS, padding: "14px 0", marginRight: 32, cursor: "pointer", letterSpacing: "0.02em", textTransform: "capitalize" }}>
            {t === "invoices" ? "Invoices" : "Clients"}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {tab === "clients" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={syncFromFreshbooks} disabled={syncing || syncCooldown} style={{ ...ghostBtn, opacity: (syncing || syncCooldown) ? 0.4 : 1, cursor: (syncing || syncCooldown) ? "not-allowed" : "pointer" }}>
              {syncing ? "Syncing…" : syncCooldown ? "↻ Cooling down…" : "↻ Sync from FreshBooks"}
            </button>
            <button onClick={openNewClient} style={primaryBtn}>+ New Client</button>
          </div>
        )}
        {tab === "invoices" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={syncInvoicesFromFreshbooks} disabled={invoiceSyncing || syncCooldown} style={{ ...ghostBtn, opacity: (invoiceSyncing || syncCooldown) ? 0.4 : 1, cursor: (invoiceSyncing || syncCooldown) ? "not-allowed" : "pointer" }}>
              {invoiceSyncing ? "Syncing…" : syncCooldown ? "↻ Cooling down…" : "↻ Sync from FreshBooks"}
            </button>
            <button onClick={() => setShowInvoiceForm(true)} style={primaryBtn}>+ New Invoice</button>
          </div>
        )}
      </div>

      {apiError && (
        <div style={{ margin: "24px 48px 0", padding: "12px 16px", background: "#1a0000", border: "1px solid #330000", borderRadius: 8, color: "#E8001C", fontSize: 13 }}>
          {apiError}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* INVOICES TAB                                                         */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "invoices" && (
        <div style={{ padding: "32px 48px" }}>
          {invoiceSyncResult && (
            <div style={{ marginBottom: 16, padding: "10px 16px", background: invoiceSyncResult.error ? "#1a0000" : "#0d1a00", border: `1px solid ${invoiceSyncResult.error ? "#330000" : "#2a4e0a"}`, borderRadius: 8, color: invoiceSyncResult.error ? "#E8001C" : "#CCFF00", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {invoiceSyncResult.error
                ? `Sync failed: ${invoiceSyncResult.error}`
                : `Sync complete — ${invoiceSyncResult.created} created, ${invoiceSyncResult.updated} updated, ${invoiceSyncResult.skipped} skipped`}
              <button onClick={() => setInvoiceSyncResult(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16, padding: 0, marginLeft: 12 }}>×</button>
            </div>
          )}
          {loadingI ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1e1e1e" }}>
                    {["Invoice #", "Client", "Issue Date", "Due Date", "Total", "Status", "Actions"].map(h => (
                      <th key={h} style={{ textAlign: "left", color: "#444", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 16px 12px 0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <InvoiceRowSkeleton />
                  <InvoiceRowSkeleton />
                  <InvoiceRowSkeleton />
                  <InvoiceRowSkeleton />
                  <InvoiceRowSkeleton />
                </tbody>
              </table>
            </div>
          ) : invoices.length === 0 ? (
            <div style={{ color: "#333", fontSize: 14, padding: "60px 0", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
              No invoices yet. Create your first one.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1e1e1e" }}>
                    {["Invoice #", "Client", "Issue Date", "Due Date", "Total", "Status", "Actions"].map(h => (
                      <th key={h} style={{ textAlign: "left", color: "#444", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 16px 12px 0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} style={{ borderBottom: "1px solid #111" }}>
                      <td style={{ padding: "14px 16px 14px 0", color: "#fff", fontWeight: 700, fontFamily: "monospace", fontSize: 13 }}>{inv.invoice_number}</td>
                      <td style={{ padding: "14px 16px 14px 0" }}>
                        <div style={{ color: "#fff", fontWeight: 600 }}>{inv.clients?.name ?? "—"}</div>
                        {inv.clients?.company && <div style={{ color: "#555", fontSize: 11 }}>{inv.clients.company}</div>}
                      </td>
                      <td style={{ padding: "14px 16px 14px 0", color: "#888" }}>{fmtDate(inv.issue_date)}</td>
                      <td style={{ padding: "14px 16px 14px 0", color: inv.status === "overdue" ? "#E8001C" : "#888" }}>{fmtDate(inv.due_date)}</td>
                      <td style={{ padding: "14px 16px 14px 0", color: "#CCFF00", fontWeight: 700 }}>{fmt(inv.total, inv.currency)}</td>
                      <td style={{ padding: "14px 16px 14px 0" }}><StatusBadge status={inv.status} /></td>
                      <td style={{ padding: "14px 0", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {/* Send */}
                          {["draft", "sent", "viewed", "overdue"].includes(inv.status) && (
                            <button onClick={() => { setSendModal(inv); setSendMethod("email"); setSendError(""); setSendSuccess(""); }} style={{ background: "transparent", color: "#949494", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 24, padding: "5px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "1px", lineHeight: 1 }}>
                              Send
                            </button>
                          )}
                          {/* Mark Paid */}
                          {["sent", "viewed", "overdue"].includes(inv.status) && (
                            <button onClick={() => markPaid(inv)} style={{ background: "rgba(204,255,0,0.1)", color: "#CCFF00", border: "1px solid #CCFF00", borderRadius: 24, padding: "5px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "1px", lineHeight: 1 }}>
                              Mark Paid
                            </button>
                          )}
                          {/* Payment link */}
                          {inv.payment_url && (
                            <a href={inv.payment_url} target="_blank" rel="noopener noreferrer" style={{ background: "transparent", color: "#949494", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 24, padding: "5px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer", textDecoration: "none", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "1px", lineHeight: 1 }}>
                              FreshBooks ↗
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* CLIENTS TAB                                                          */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === "clients" && (
        <div style={{ padding: "32px 48px" }}>
          {syncResult && (
            <div style={{ marginBottom: 16, padding: "10px 16px", background: syncResult.error ? "#1a0000" : "#0d1a00", border: `1px solid ${syncResult.error ? "#330000" : "#2a4e0a"}`, borderRadius: 8, color: syncResult.error ? "#E8001C" : "#CCFF00", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {syncResult.error
                ? `Sync failed: ${syncResult.error}`
                : `Sync complete — ${syncResult.created} created, ${syncResult.updated} updated, ${syncResult.pushed} pushed to FreshBooks, ${syncResult.skipped} skipped`}
              <button onClick={() => setSyncResult(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16, padding: 0, marginLeft: 12 }}>×</button>
            </div>
          )}
          {loadingC ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              <ClientCardSkeleton />
              <ClientCardSkeleton />
              <ClientCardSkeleton />
              <ClientCardSkeleton />
              <ClientCardSkeleton />
              <ClientCardSkeleton />
            </div>
          ) : clients.length === 0 ? (
            <div style={{ color: "#949494", fontSize: 14, padding: "60px 0", textAlign: "center", lineHeight: 1 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
              No clients yet. Add your first client.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {clients.map(c => (
                <div key={c.id} style={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "20px 24px" }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#fff", marginBottom: 4, lineHeight: 1 }}>{c.name}</div>
                  {c.company && <div style={{ color: "#949494", fontSize: 12, marginBottom: 12, lineHeight: 1 }}>{c.company}</div>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {c.email && <div style={{ color: "#949494", fontSize: 12, display: "flex", gap: 8, lineHeight: 1 }}><span style={{ color: "rgba(255,255,255,0.4)" }}>Email</span>{c.email}</div>}
                    {c.phone && <div style={{ color: "#949494", fontSize: 12, display: "flex", gap: 8, lineHeight: 1 }}><span style={{ color: "rgba(255,255,255,0.4)" }}>Phone</span>{c.phone}</div>}
                  </div>
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {c.freshbooks_contact_id ? (
                          <span style={{ fontSize: 9, color: "#CCFF00", background: "rgba(204,255,0,0.12)", borderRadius: 20, padding: "2px 7px", fontWeight: 700, letterSpacing: "0.5px", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", lineHeight: 1 }}>FB Synced</span>
                        ) : (
                          <span style={{ fontSize: 9, color: "#949494", background: "rgba(255,255,255,0.07)", borderRadius: 20, padding: "2px 7px", fontWeight: 700, letterSpacing: "0.5px", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", lineHeight: 1 }}>Not Synced</span>
                        )}
                        {c.sms_consent_at ? (
                          <span style={{ fontSize: 9, color: "#7fd99e", background: "rgba(127,217,158,0.15)", borderRadius: 20, padding: "2px 7px", fontWeight: 700, letterSpacing: "0.5px", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", lineHeight: 1 }}>SMS Opted In</span>
                        ) : (
                          <span style={{ fontSize: 9, color: "#949494", background: "rgba(255,255,255,0.07)", borderRadius: 20, padding: "2px 7px", fontWeight: 700, letterSpacing: "0.5px", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", lineHeight: 1 }}>SMS Not Opted In</span>
                        )}
                      </div>
                      <button onClick={() => openEditClient(c)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 24, color: "#949494", fontSize: 10, padding: "4px 12px", cursor: "pointer", fontWeight: 700, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "1px", lineHeight: 1 }}>
                        Edit
                      </button>
                    </div>
                    {!c.sms_consent_at && c.email && (
                      <button
                        onClick={() => sendSmsOptin(c.id)}
                        disabled={optinSending === c.id}
                        style={{ width: "100%", padding: "8px 0", background: "transparent", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 24, color: optinSending === c.id ? "rgba(255,255,255,0.3)" : "#949494", fontSize: 10, cursor: optinSending === c.id ? "default" : "pointer", fontWeight: 700, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "1px", lineHeight: 1 }}
                      >
                        {optinSending === c.id ? "Sending..." : "Send SMS Opt-In Email"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* NEW CLIENT MODAL                                                      */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {showClientForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={e => e.target === e.currentTarget && setShowClientForm(false)}>
          <div style={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 16, width: "100%", maxWidth: 480, padding: 32 }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: "#fff", marginBottom: 24, lineHeight: 1 }}>{editingClient ? "Edit Client" : "New Client"}</div>
            <form onSubmit={submitClient} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={LABEL}>Name</label>
                <input style={INPUT} value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name or business name" autoFocus />
              </div>
              <div>
                <label style={LABEL}>Company</label>
                <input style={INPUT} value={clientForm.company} onChange={e => setClientForm(f => ({ ...f, company: e.target.value }))} placeholder="Required if no name" />
              </div>
              <div>
                <label style={LABEL}>Email</label>
                <input style={INPUT} type="email" value={clientForm.email} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} placeholder="client@example.com" />
              </div>
              <div>
                <label style={LABEL}>Phone</label>
                <input style={INPUT} type="tel" value={clientForm.phone} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" />
              </div>
              {clientError && <div style={{ color: "#E8001C", fontSize: 13, lineHeight: 1 }}>{clientError}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="submit" disabled={savingClient} style={{ flex: 1, background: "#CCFF00", color: "#000", border: "none", borderRadius: 24, padding: "11px 0", fontWeight: 700, fontSize: 11, cursor: "pointer", opacity: savingClient ? 0.6 : 1, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "1.5px", lineHeight: 1 }}>
                  {savingClient ? "Saving..." : editingClient ? "Save Changes" : "Create Client"}
                </button>
                <button type="button" onClick={() => setShowClientForm(false)} style={{ padding: "11px 20px", background: "transparent", color: "#949494", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 24, fontSize: 10, cursor: "pointer", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "1.5px", lineHeight: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* NEW INVOICE MODAL                                                     */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {showInvoiceForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 24px", overflowY: "auto" }}
          onClick={e => e.target === e.currentTarget && setShowInvoiceForm(false)}>
          <div style={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 16, width: "100%", maxWidth: 640, padding: 36, marginBottom: 40 }}>
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: -0.5 }}>New Invoice</div>
            </div>
            <form onSubmit={submitInvoice} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Client */}
              <div>
                <label style={LABEL}>Client *</label>
                <select value={invoiceForm.client_id} onChange={e => setInvoiceForm(f => ({ ...f, client_id: e.target.value }))} style={{ ...INPUT, appearance: "none" }}>
                  <option value="">Select a client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.company}{c.name && c.company ? ` — ${c.company}` : ""}</option>)}
                </select>
              </div>

              {/* Dates */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={LABEL}>Issue Date *</label>
                  <input style={INPUT} type="date" value={invoiceForm.issue_date} onChange={e => setInvoiceForm(f => ({ ...f, issue_date: e.target.value }))} />
                </div>
                <div>
                  <label style={LABEL}>Due Date *</label>
                  <input style={INPUT} type="date" value={invoiceForm.due_date} onChange={e => setInvoiceForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>

              {/* Line items */}
              <div>
                <label style={LABEL}>Line Items *</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {lineItems.map((li, i) => (
                    <div key={li._id} style={{ display: "grid", gridTemplateColumns: "1fr 72px 96px 32px", gap: 8, alignItems: "center" }}>
                      <input style={INPUT} placeholder="Description" value={li.description} onChange={e => updateLine(li._id, "description", e.target.value)} />
                      <input style={{ ...INPUT, textAlign: "center" }} type="number" min="1" step="1" placeholder="Qty" value={li.quantity} onChange={e => updateLine(li._id, "quantity", e.target.value)} />
                      <input style={{ ...INPUT, textAlign: "right" }} type="number" min="0" step="0.01" placeholder="Price" value={li.unit_price} onChange={e => updateLine(li._id, "unit_price", e.target.value)} />
                      <button type="button" onClick={() => removeLine(li._id)} style={{ background: "none", border: "none", color: "#949494", fontSize: 18, cursor: "pointer", padding: 0, textAlign: "center", lineHeight: 1 }} title="Remove">×</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setLineItems(prev => [...prev, emptyLine()])} style={{ background: "none", border: "1px dashed rgba(255,255,255,0.14)", borderRadius: 8, color: "#949494", fontSize: 11, fontWeight: 700, padding: "8px 0", cursor: "pointer", marginTop: 4, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "1px", lineHeight: 1 }}>
                    + Add Line Item
                  </button>
                </div>

                {/* Subtotal preview */}
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "120px 96px", gap: 8 }}>
                    <div style={{ fontSize: 11, color: "#949494", textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", lineHeight: 1 }}>Tax %</div>
                    <input style={{ ...INPUT, textAlign: "right" }} type="number" min="0" max="100" step="0.1" placeholder="0" value={invoiceForm.tax_rate} onChange={e => setInvoiceForm(f => ({ ...f, tax_rate: e.target.value }))} />
                  </div>
                  <div style={{ fontSize: 12, color: "#949494", lineHeight: 1 }}>Subtotal: <strong style={{ color: "#fff" }}>{fmt(invoiceSubtotal())}</strong></div>
                  <div style={{ fontSize: 15, color: "#CCFF00", fontWeight: 900, lineHeight: 1 }}>Total: {fmt(invoiceTotal())}</div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={LABEL}>Notes</label>
                <textarea style={{ ...INPUT, resize: "vertical", minHeight: 72, fontFamily: "inherit" }} placeholder="Payment terms, project details…" value={invoiceForm.notes} onChange={e => setInvoiceForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              {/* Recurring */}
              <div style={{ background: "#2a2a2a", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "16px 18px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={invoiceForm.is_recurring} onChange={e => setInvoiceForm(f => ({ ...f, is_recurring: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "#CCFF00" }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#fff", lineHeight: 1 }}>Recurring Invoice</span>
                </label>
                {invoiceForm.is_recurring && (
                  <div style={{ marginTop: 12 }}>
                    <label style={LABEL}>Frequency</label>
                    <select value={invoiceForm.recurrence_rule} onChange={e => setInvoiceForm(f => ({ ...f, recurrence_rule: e.target.value }))} style={{ ...INPUT, width: "auto", appearance: "none", minWidth: 160 }}>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    <div style={{ fontSize: 11, color: "#949494", marginTop: 8, lineHeight: 1 }}>
                      Auto-generates and emails a new invoice on the next cycle date.
                    </div>
                  </div>
                )}
              </div>

              {invoiceError && <div style={{ color: "#E8001C", fontSize: 13, lineHeight: 1 }}>{invoiceError}</div>}

              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={savingInvoice} style={{ flex: 1, background: "#CCFF00", color: "#000", border: "none", borderRadius: 24, padding: "12px 0", fontWeight: 700, fontSize: 11, cursor: "pointer", opacity: savingInvoice ? 0.6 : 1, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "1.5px", lineHeight: 1 }}>
                  {savingInvoice ? "Creating..." : "Create Invoice"}
                </button>
                <button type="button" onClick={() => setShowInvoiceForm(false)} style={{ padding: "12px 20px", background: "transparent", color: "#949494", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 24, fontSize: 10, cursor: "pointer", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "1.5px", lineHeight: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SEND INVOICE MODAL                                                    */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {sendModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={e => e.target === e.currentTarget && !sending && setSendModal(null)}>
          <div style={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 16, width: "100%", maxWidth: 440, padding: 32 }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: "#fff", marginBottom: 6, lineHeight: 1 }}>Send Invoice</div>
            <div style={{ color: "#949494", fontSize: 13, marginBottom: 24, lineHeight: 1 }}>
              {sendModal.invoice_number} — {fmt(sendModal.total, sendModal.currency)} — {sendModal.clients?.name}
            </div>

            {/* Delivery method */}
            <div style={{ marginBottom: 24 }}>
              <label style={LABEL}>Delivery Method</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { value: "email", label: "Email", icon: "✉️" },
                  { value: "sms",   label: "Text",  icon: "💬" },
                  { value: "both",  label: "Both",  icon: "📨" },
                ].map(m => {
                  const active = sendMethod === m.value;
                  // Validate prerequisites
                  const noEmail = !sendModal.clients?.email && (m.value === "email" || m.value === "both");
                  const noPhone = !sendModal.clients?.phone && (m.value === "sms" || m.value === "both");
                  const disabled = noEmail || noPhone;
                  return (
                    <button key={m.value} type="button" onClick={() => !disabled && setSendMethod(m.value)} title={disabled ? (noEmail ? "Client has no email" : "Client has no phone") : ""} style={{ flex: 1, background: active ? "#CCFF00" : "#2a2a2a", color: active ? "#000" : disabled ? "rgba(255,255,255,0.2)" : "#949494", border: `1.5px solid ${active ? "#CCFF00" : "rgba(255,255,255,0.14)"}`, borderRadius: 10, padding: "12px 0", fontWeight: 800, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, lineHeight: 1 }}>
                      <span style={{ fontSize: 20 }}>{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delivery preview */}
            <div style={{ background: "#2a2a2a", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "12px 16px", fontSize: 12, color: "#949494", marginBottom: 20, lineHeight: 1.5 }}>
              {(sendMethod === "email" || sendMethod === "both") && sendModal.clients?.email && (
                <div style={{ lineHeight: 1 }}>Email → <span style={{ color: "#fff" }}>{sendModal.clients.email}</span></div>
              )}
              {(sendMethod === "sms" || sendMethod === "both") && sendModal.clients?.phone && (
                <div style={{ lineHeight: 1, marginTop: 6 }}>SMS → <span style={{ color: "#fff" }}>{sendModal.clients.phone}</span></div>
              )}
            </div>

            {sendError && <div style={{ color: "#E8001C", fontSize: 13, marginBottom: 12, lineHeight: 1 }}>{sendError}</div>}
            {sendSuccess && <div style={{ color: "#CCFF00", fontSize: 13, marginBottom: 12, fontWeight: 700, lineHeight: 1 }}>{sendSuccess}</div>}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={sendInvoice} disabled={sending} style={{ flex: 1, background: "#CCFF00", color: "#000", border: "none", borderRadius: 24, padding: "12px 0", fontWeight: 700, fontSize: 11, cursor: "pointer", opacity: sending ? 0.6 : 1, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "1.5px", lineHeight: 1 }}>
                {sending ? "Sending..." : `Send via ${sendMethod === "both" ? "Email & SMS" : sendMethod === "email" ? "Email" : "SMS"}`}
              </button>
              <button onClick={() => setSendModal(null)} disabled={sending} style={{ padding: "12px 20px", background: "transparent", color: "#949494", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 24, fontSize: 10, cursor: "pointer", opacity: sending ? 0.5 : 1, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "1.5px", lineHeight: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <AppDialog open={!!markPaidConfirm} onClose={() => setMarkPaidConfirm(null)} title="Mark as paid">
        <p style={{ fontSize: 14, color: C.meta, fontFamily: SANS, marginTop: 8, marginBottom: 24, lineHeight: "160%" }}>
          Mark invoice {markPaidConfirm?.invoice_number} as paid?
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => setMarkPaidConfirm(null)} style={ghostBtn}>Cancel</button>
          <button onClick={() => confirmMarkPaid(markPaidConfirm)} style={dangerBtn}>Mark paid</button>
        </div>
      </AppDialog>
    </div>
  );
}
