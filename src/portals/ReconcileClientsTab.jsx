// src/portals/ReconcileClientsTab.jsx
// Manual FreshBooks ↔ app client reconciliation. Admin-only tab inside BillingPortal.

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  SANS, MONO, C, INPUT, primaryBtn, ghostBtn, dangerBtn,
  BTN_ROW, DISPLAY_TITLE, DISPLAY_SUBTITLE,
} from "../theme";
import { supabase } from "../supabase";
import { useApp } from "../AppContext";
import AppDialog from "../components/AppDialog";

const sectionWrap = { marginBottom: 36 };
const sectionHead = { marginBottom: 16 };
const sectionTitle = {
  fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.text,
  textTransform: "uppercase", letterSpacing: "1.5px", lineHeight: 1,
};
const sectionMeta = {
  marginTop: 6, fontFamily: SANS, fontSize: 12, color: C.meta, lineHeight: 1.4,
};
const rowStyle = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: "16px 20px",
  display: "flex",
  alignItems: "center",
  gap: 16,
  marginBottom: 8,
};
const rowMain = { flex: 1, minWidth: 0 };
const rowName = {
  fontWeight: 700, fontSize: 14, color: C.text, lineHeight: 1.2,
  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
};
const rowSub = {
  marginTop: 4, fontSize: 11, color: C.meta, lineHeight: 1.4,
};
const tag = (color = C.meta) => ({
  display: "inline-block", padding: "2px 8px", borderRadius: 20,
  fontSize: 9, fontFamily: MONO, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.8px", lineHeight: 1,
  background: "rgba(255,255,255,0.07)", color,
  marginRight: 6,
});
const empty = {
  padding: "24px 0", color: C.meta, fontSize: 13, fontFamily: SANS, lineHeight: 1.4,
};

export default function ReconcileClientsTab() {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [fbClients, setFbClients] = useState([]);
  const [appClients, setAppClients] = useState([]);

  // Modal state ────────────────────────────────────────────────────────────
  const [linkModal, setLinkModal] = useState(null); // { fb } or { app }
  const [linkPick, setLinkPick] = useState("");
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [linkError, setLinkError] = useState("");

  const [mergeModal, setMergeModal] = useState(null); // { source }
  const [mergePick, setMergePick] = useState("");
  const [mergeSubmitting, setMergeSubmitting] = useState(false);
  const [mergeError, setMergeError] = useState("");

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
    if (!res.ok) {
      const err = new Error(body.error || `HTTP ${res.status}`);
      err.body = body;
      throw err;
    }
    return body;
  }, []);

  const load = useCallback(async ({ initial = false } = {}) => {
    if (initial) setLoading(true); else setRefreshing(true);
    setError("");
    try {
      const data = await apiFetch("/api/billing/reconcile-clients");
      setFbClients(data.fbClients ?? []);
      setAppClients(data.appClients ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      if (initial) setLoading(false); else setRefreshing(false);
    }
  }, [apiFetch]);

  useEffect(() => { load({ initial: true }); }, [load]);

  // Categorize ─────────────────────────────────────────────────────────────
  const { linked, fbOnly, appOnly } = useMemo(() => {
    const appByFbId = Object.fromEntries(
      appClients
        .filter(c => c.freshbooks_contact_id)
        .map(c => [String(c.freshbooks_contact_id), c])
    );
    const linkedFbIds = new Set();
    const linked = [];
    for (const fb of fbClients) {
      const app = appByFbId[String(fb.freshbooks_contact_id)];
      if (app) {
        linked.push({ fb, app });
        linkedFbIds.add(String(fb.freshbooks_contact_id));
      }
    }
    const fbOnly = fbClients.filter(c => !linkedFbIds.has(String(c.freshbooks_contact_id)));
    const appOnly = appClients.filter(c => !c.freshbooks_contact_id);
    return { linked, fbOnly, appOnly };
  }, [fbClients, appClients]);

  // ── Apply FB name to a linked app client (uses link action with same FB id)
  async function applyFbName(pair) {
    try {
      await apiFetch("/api/billing/reconcile-clients", {
        method: "POST",
        body: JSON.stringify({
          action: "link",
          freshbooks_contact_id: pair.fb.freshbooks_contact_id,
          app_client_id: pair.app.id,
        }),
      });
      showToast(`Updated "${pair.app.name}" → "${pair.fb.preferred_name}"`, "success");
      await load();
    } catch (e) {
      showToast(`Apply failed: ${e.message}`, "error");
    }
  }

  // ── Link modal ──────────────────────────────────────────────────────────
  function openLinkFromFb(fb) {
    setLinkModal({ fb });
    setLinkPick("");
    setLinkError("");
  }
  function openLinkFromApp(app) {
    setLinkModal({ app });
    setLinkPick("");
    setLinkError("");
  }
  async function submitLink() {
    if (!linkPick) return setLinkError("Select a client to link.");
    setLinkSubmitting(true);
    setLinkError("");
    try {
      const body = linkModal.fb
        ? { action: "link", freshbooks_contact_id: linkModal.fb.freshbooks_contact_id, app_client_id: linkPick }
        : { action: "link", freshbooks_contact_id: linkPick, app_client_id: linkModal.app.id };
      await apiFetch("/api/billing/reconcile-clients", {
        method: "POST",
        body: JSON.stringify(body),
      });
      showToast("Link saved.", "success");
      setLinkModal(null);
      await load();
    } catch (e) {
      setLinkError(e.message);
    } finally {
      setLinkSubmitting(false);
    }
  }

  // ── Merge modal ─────────────────────────────────────────────────────────
  function openMerge(source) {
    setMergeModal({ source });
    setMergePick("");
    setMergeError("");
  }
  async function submitMerge() {
    if (!mergePick) return setMergeError("Select a target client.");
    if (mergePick === mergeModal.source.id) return setMergeError("Source and target must differ.");
    setMergeSubmitting(true);
    setMergeError("");
    try {
      const result = await apiFetch("/api/billing/reconcile-clients", {
        method: "POST",
        body: JSON.stringify({
          action: "merge",
          source_client_id: mergeModal.source.id,
          target_client_id: mergePick,
        }),
      });
      const moved = `${result.invoicesMoved} invoice(s), ${result.calendarsMoved} calendar(s), ${result.scheduledPostsRenamed} post(s), ${result.contentPlansRenamed} plan(s)`;
      showToast(`Merged. Moved ${moved}.`, "success");
      setMergeModal(null);
      await load();
    } catch (e) {
      setMergeError(e.message);
    } finally {
      setMergeSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "32px 48px", fontFamily: SANS }}>
      <div style={{ marginBottom: 32, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={DISPLAY_TITLE}>Reconcile Clients</div>
          <div style={DISPLAY_SUBTITLE}>
            Manually link FreshBooks contacts to app clients, fix mismatched names, and merge duplicates.
            Reconciliation is the source of truth — what you set here overrides auto-sync.
          </div>
        </div>
        <button
          onClick={() => load()}
          disabled={refreshing || loading}
          style={{ ...ghostBtn, opacity: (refreshing || loading) ? 0.5 : 1 }}
        >
          {refreshing ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 24, padding: "12px 16px", background: "rgba(232,0,28,0.06)", border: `1px solid rgba(232,0,28,0.35)`, borderRadius: 8, color: C.error, fontSize: 13, fontFamily: SANS }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={empty}>Loading…</div>
      ) : (
        <>
          {/* ── Linked ─────────────────────────────────────────────────── */}
          <div style={sectionWrap}>
            <div style={sectionHead}>
              <div style={sectionTitle}>Linked ({linked.length})</div>
              <div style={sectionMeta}>
                FreshBooks contacts already paired with an app client.
                Mismatched names show an "Apply FB name" button.
              </div>
            </div>
            {linked.length === 0 ? (
              <div style={empty}>No linked clients yet.</div>
            ) : (
              linked.map(pair => {
                const fbName = pair.fb.preferred_name || "—";
                const mismatch = pair.app.name !== fbName;
                return (
                  <div key={pair.app.id} style={rowStyle}>
                    <div style={rowMain}>
                      <div style={rowName}>{pair.app.name || "—"}</div>
                      <div style={rowSub}>
                        <span style={tag(C.accent)}>FB Linked</span>
                        FB says: {fbName}
                        {pair.fb.email ? ` · ${pair.fb.email}` : ""}
                        {pair.fb.phone ? ` · ${pair.fb.phone}` : ""}
                      </div>
                    </div>
                    <div style={BTN_ROW}>
                      {mismatch && (
                        <button onClick={() => applyFbName(pair)} style={primaryBtn}>
                          Apply FB name
                        </button>
                      )}
                      {!mismatch && (
                        <span style={{ ...tag(C.meta), background: "transparent", border: `1px solid ${C.border}` }}>
                          In sync
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── FreshBooks-only ────────────────────────────────────────── */}
          <div style={sectionWrap}>
            <div style={sectionHead}>
              <div style={sectionTitle}>FreshBooks only ({fbOnly.length})</div>
              <div style={sectionMeta}>
                FreshBooks contacts not linked to any app client.
                Link them to an existing app client or run sync to create new ones.
              </div>
            </div>
            {fbOnly.length === 0 ? (
              <div style={empty}>All FreshBooks contacts are linked.</div>
            ) : (
              fbOnly.map(fb => (
                <div key={fb.freshbooks_contact_id} style={rowStyle}>
                  <div style={rowMain}>
                    <div style={rowName}>{fb.preferred_name || "—"}</div>
                    <div style={rowSub}>
                      <span style={tag(C.meta)}>FB only</span>
                      {fb.organization && fb.preferred_name !== fb.organization ? `Org: ${fb.organization} · ` : ""}
                      {(fb.fname || fb.lname) ? `Person: ${[fb.fname, fb.lname].filter(Boolean).join(" ")}` : ""}
                      {fb.email ? ` · ${fb.email}` : ""}
                      {fb.phone ? ` · ${fb.phone}` : ""}
                    </div>
                  </div>
                  <div style={BTN_ROW}>
                    <button onClick={() => openLinkFromFb(fb)} style={primaryBtn}>
                      Link to app client…
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── App-only ────────────────────────────────────────────────── */}
          <div style={sectionWrap}>
            <div style={sectionHead}>
              <div style={sectionTitle}>App only ({appOnly.length})</div>
              <div style={sectionMeta}>
                App clients with no FreshBooks link.
                Link to a FreshBooks contact, or merge into another app client to clean up duplicates.
              </div>
            </div>
            {appOnly.length === 0 ? (
              <div style={empty}>All app clients are linked.</div>
            ) : (
              appOnly.map(app => (
                <div key={app.id} style={rowStyle}>
                  <div style={rowMain}>
                    <div style={rowName}>{app.name || "—"}</div>
                    <div style={rowSub}>
                      <span style={tag(C.meta)}>App only</span>
                      {app.company ? `Company: ${app.company}` : ""}
                      {app.email ? ` · ${app.email}` : ""}
                      {app.phone ? ` · ${app.phone}` : ""}
                    </div>
                  </div>
                  <div style={BTN_ROW}>
                    <button onClick={() => openLinkFromApp(app)} style={ghostBtn}>
                      Link to FreshBooks…
                    </button>
                    <button onClick={() => openMerge(app)} style={dangerBtn}>
                      Merge into…
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── Link modal ────────────────────────────────────────────────── */}
      <AppDialog
        open={!!linkModal}
        onClose={() => setLinkModal(null)}
        title={linkModal?.fb ? "Link FreshBooks contact" : "Link to FreshBooks contact"}
        width={520}
      >
        {linkModal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
            <div style={{ fontSize: 13, color: C.meta, fontFamily: SANS, lineHeight: 1.5 }}>
              {linkModal.fb ? (
                <>
                  Linking <strong style={{ color: C.text }}>{linkModal.fb.preferred_name}</strong> (FreshBooks)
                  to an existing app client. The app client's name, company, email, and phone will be
                  overwritten with FreshBooks data (org-first naming).
                </>
              ) : (
                <>
                  Linking <strong style={{ color: C.text }}>{linkModal.app.name}</strong> (app) to a
                  FreshBooks contact. This client's fields will be overwritten with FreshBooks data.
                </>
              )}
            </div>

            <div>
              <label style={{ fontSize: 10, color: C.meta, textTransform: "uppercase", letterSpacing: "1.5px", display: "block", marginBottom: 6, fontWeight: 600, fontFamily: MONO }}>
                {linkModal.fb ? "App client" : "FreshBooks contact"}
              </label>
              <select
                style={{ ...INPUT, appearance: "none" }}
                value={linkPick}
                onChange={e => setLinkPick(e.target.value)}
              >
                <option value="">Select…</option>
                {linkModal.fb
                  ? appOnly.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.company ? ` — ${c.company}` : ""}
                      </option>
                    ))
                  : fbOnly.map(c => (
                      <option key={c.freshbooks_contact_id} value={c.freshbooks_contact_id}>
                        {c.preferred_name}
                        {c.email ? ` — ${c.email}` : ""}
                      </option>
                    ))}
              </select>
            </div>

            {linkError && (
              <div style={{ color: C.error, fontSize: 13, fontFamily: SANS, lineHeight: 1.4 }}>{linkError}</div>
            )}

            <div style={{ ...BTN_ROW, justifyContent: "flex-end", marginTop: 8 }}>
              <button onClick={() => setLinkModal(null)} style={ghostBtn} disabled={linkSubmitting}>Cancel</button>
              <button onClick={submitLink} style={primaryBtn} disabled={linkSubmitting}>
                {linkSubmitting ? "Linking…" : "Link"}
              </button>
            </div>
          </div>
        )}
      </AppDialog>

      {/* ── Merge modal ───────────────────────────────────────────────── */}
      <AppDialog
        open={!!mergeModal}
        onClose={() => setMergeModal(null)}
        title="Merge app clients"
        width={520}
      >
        {mergeModal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
            <div style={{ fontSize: 13, color: C.meta, fontFamily: SANS, lineHeight: 1.5 }}>
              Merging <strong style={{ color: C.text }}>{mergeModal.source.name}</strong> into another
              app client. All calendars, invoices, and scheduled/planned content will move to the
              target. The source client will be deleted. This cannot be undone.
            </div>

            <div>
              <label style={{ fontSize: 10, color: C.meta, textTransform: "uppercase", letterSpacing: "1.5px", display: "block", marginBottom: 6, fontWeight: 600, fontFamily: MONO }}>
                Target (keep this client)
              </label>
              <select
                style={{ ...INPUT, appearance: "none" }}
                value={mergePick}
                onChange={e => setMergePick(e.target.value)}
              >
                <option value="">Select target…</option>
                {appClients
                  .filter(c => c.id !== mergeModal.source.id)
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.company && c.company !== c.name ? ` — ${c.company}` : ""}
                      {c.freshbooks_contact_id ? " · FB linked" : ""}
                    </option>
                  ))}
              </select>
            </div>

            {mergeError && (
              <div style={{ color: C.error, fontSize: 13, fontFamily: SANS, lineHeight: 1.4 }}>{mergeError}</div>
            )}

            <div style={{ ...BTN_ROW, justifyContent: "flex-end", marginTop: 8 }}>
              <button onClick={() => setMergeModal(null)} style={ghostBtn} disabled={mergeSubmitting}>Cancel</button>
              <button onClick={submitMerge} style={dangerBtn} disabled={mergeSubmitting}>
                {mergeSubmitting ? "Merging…" : "Merge & delete source"}
              </button>
            </div>
          </div>
        )}
      </AppDialog>
    </div>
  );
}
