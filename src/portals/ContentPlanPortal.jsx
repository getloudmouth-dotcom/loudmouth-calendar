import { supabase } from "../supabase";
import { MONTHS, PORTALS } from "../constants";
import { useApp } from "../AppContext";
import { useState, useEffect } from "react";
import PinterestPanel from "../components/PinterestPanel";

import {
  SANS, MONO, DISP, C, INPUT,
  primaryBtn, ghostBtn, dangerBtn,
  PAGE_HEADER, PAGE_TITLE, BTN_ROW,
  DOC, DOC_PAGE, DOC_PAGE_OUTER, DOC_INPUT, DOC_LABEL,
} from "../theme";
import AppDialog from "../components/AppDialog";

const PINTEREST_RED = "#E60023";

// Approval pill colors used inside the document (light surface).
const docApprovalStyle = status => ({
  background:
    status === "approved" ? "rgba(127,217,158,0.18)" :
    status === "denied"   ? "rgba(232,0,28,0.10)" :
                            DOC.cell,
  color:
    status === "approved" ? "#1f6e3d" :
    status === "denied"   ? C.error :
                            DOC.meta,
  borderColor:
    status === "approved" ? C.success :
    status === "denied"   ? "rgba(232,0,28,0.4)" :
                            DOC.border,
});

export default function ContentPlanPortal({
  currentCPId, setCurrentCPId,
  activeCPStep, setActiveCPStep,
  cpClientName,
  cpEntryFromMonth, setCpEntryFromMonth,
  cpMonth,
  cpYear,
  cpShootDate, setCpShootDate,
  cpProducedCount, setCpProducedCount,
  cpOrganicCount, setCpOrganicCount,
  cpItems, setCpItems,
  cpSaving,
  saveContentPlan, generateCPItems, updateCPItem,
  getOrCreateShareToken,
  cpShareModal, setCpShareModal,
  cpShareMethod, setCpShareMethod,
  cpShareBusy,
  cpShareError, setCpShareError,
  cpShareSuccess, setCpShareSuccess,
  doSendContentPlan,
  cpReferenceImages, addCPReferenceImages, removeCPReferenceImage,
  pinterestToken, setPinterestToken,
  pinterestOpen, setPinterestOpen,
  pinterestPanelWidth, setPinterestPanelWidth,
  setActivePortal,
}) {
  const { showToast } = useApp();
  const [creators, setCreators] = useState([]);
  const [overridePhone, setOverridePhone] = useState(null);
  const [overrideEmail, setOverrideEmail] = useState(null);
  const [trimConfirm, setTrimConfirm] = useState(null);

  function handleCountChange(kind, raw) {
    const next = Math.max(0, Math.min(20, Number(raw) || 0));
    const trimmed = cpItems.filter(it =>
      it.item_type === kind && it.item_number > next &&
      (it.reference_link || it.whats_needed || it.creator_name || it.title)
    );
    const apply = () => {
      if (kind === "produced") setCpProducedCount(next); else setCpOrganicCount(next);
      const p = kind === "produced" ? next : cpProducedCount;
      const o = kind === "organic"  ? next : cpOrganicCount;
      setCpItems(generateCPItems(p, o, cpItems));
    };
    if (trimmed.length > 0) {
      setTrimConfirm({ kind, count: trimmed.length, apply });
    } else {
      apply();
    }
  }

  useEffect(() => {
    const fetchCreators = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      if (!error && data) setCreators(data);
    };
    fetchCreators();
  }, []);

  const onPreview = activeCPStep === 3;

  // Exit the portal entirely: clear plan state, route back to caller (month or home).
  const exitPortal = () => {
    const target = cpEntryFromMonth ? PORTALS.CLIENTS : PORTALS.HOME;
    setCpEntryFromMonth(false);
    setCurrentCPId(null);
    setActiveCPStep(null);
    setActivePortal(target);
  };
  const backLabel = onPreview ? "← Edit" : cpEntryFromMonth ? "← Month" : "← Home";
  const backAction = onPreview ? () => setActiveCPStep(2) : exitPortal;

  // ── Document renderer ────────────────────────────────────────────────────────
  // One recipe used for both the editable Step 2 form and the read-only Step 3
  // preview. `editable` toggles inputs vs static text. Lives inside the portal
  // function so it can close over props/state without a 20-arg signature.
  function renderRow(item, idx, editable) {
    const isProduced = item.item_type === "produced";
    const labelPrefix = isProduced ? "Produced" : "Organic";
    const rowBg = idx % 2 === 0 ? DOC.page : DOC.cell;
    const numberLabel = editable ? `#${item.item_number}` : `${labelPrefix.toUpperCase()} #${item.item_number}`;
    return (
      <tr key={item._localId || item.id} style={{ background: rowBg }}>
        <td style={{ padding: "10px 12px", verticalAlign: "top", border: `1px solid ${DOC.border}` }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: DOC.metaSoft, letterSpacing: "1px", marginBottom: 4, fontFamily: MONO, lineHeight: 1 }}>{numberLabel}</div>
          {editable ? (
            <input
              type="url"
              value={item.reference_link}
              onChange={e => updateCPItem(item._localId, "reference_link", e.target.value)}
              placeholder="Paste Link"
              style={{ ...DOC_INPUT, fontSize: 11, padding: "5px 8px", borderRadius: 6 }}
            />
          ) : (
            item.reference_link ? (
              <a href={item.reference_link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: DOC.text, fontWeight: 700, lineHeight: 1, textDecoration: "underline", fontFamily: MONO, letterSpacing: "1px" }}>LINK ↗</a>
            ) : (
              <span style={{ color: DOC.metaSoft, fontSize: 12, lineHeight: 1 }}>—</span>
            )
          )}
        </td>
        <td style={{ padding: "10px 12px", verticalAlign: "top", border: `1px solid ${DOC.border}` }}>
          {editable ? (
            <textarea
              value={item.whats_needed}
              onChange={e => updateCPItem(item._localId, "whats_needed", e.target.value)}
              placeholder="Props, people, description..."
              rows={3}
              style={{ width: "100%", fontSize: 12, border: "none", outline: "none", background: "transparent", color: DOC.text, padding: 0, resize: "vertical", fontFamily: SANS, lineHeight: 1.5, boxSizing: "border-box" }}
            />
          ) : (
            <div style={{ fontSize: 12, color: DOC.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{item.whats_needed || "—"}</div>
          )}
        </td>
        <td style={{ padding: "10px 12px", verticalAlign: "top", border: `1px solid ${DOC.border}` }}>
          {editable ? (
            <select
              value={item.creator_name}
              onChange={e => updateCPItem(item._localId, "creator_name", e.target.value)}
              style={{ width: "100%", fontSize: 12, fontWeight: 600, border: "none", outline: "none", background: "transparent", color: DOC.text, padding: 0, boxSizing: "border-box", cursor: "pointer", fontFamily: SANS, lineHeight: 1 }}
            >
              <option value="">— Select —</option>
              {creators.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          ) : (
            <div style={{ fontSize: 13, fontWeight: 700, color: DOC.text, lineHeight: 1 }}>{item.creator_name || "—"}</div>
          )}
        </td>
        <td style={{ padding: "10px 12px", verticalAlign: "middle", border: `1px solid ${DOC.border}` }}>
          {editable ? (
            <select
              value={item.approval_status}
              onChange={e => updateCPItem(item._localId, "approval_status", e.target.value)}
              style={{ width: "100%", fontSize: 11, fontWeight: 700, border: "1.5px solid", borderRadius: 20, padding: "4px 8px", outline: "none", cursor: "pointer", fontFamily: MONO, lineHeight: 1, ...docApprovalStyle(item.approval_status) }}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
            </select>
          ) : (
            <span style={{ display: "inline-block", borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700, fontFamily: MONO, lineHeight: 1, border: "1.5px solid", ...docApprovalStyle(item.approval_status) }}>
              {item.approval_status === "approved" ? "Approved" : item.approval_status === "denied" ? "Denied" : "Pending"}
            </span>
          )}
        </td>
      </tr>
    );
  }

  function renderPlanDocument(editable) {
    const producedItems = cpItems.filter(it => it.item_type === "produced");
    const organicItems = cpItems.filter(it => it.item_type === "organic");
    const showReferences = (cpReferenceImages?.length > 0) || editable;
    return (
      <div style={DOC_PAGE}>
        {/* Document header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, paddingBottom: 22, marginBottom: 24, borderBottom: `1px solid ${DOC.borderStrong}` }}>
          <div style={{ fontFamily: DISP, fontWeight: 400, fontSize: 38, color: DOC.text, lineHeight: 1, textTransform: "uppercase", letterSpacing: 0.5, display: "inline-flex", alignItems: "center", gap: 14 }}>
            <span>{MONTHS[cpMonth]} {cpYear}</span>
            <span style={{ fontFamily: SANS, fontStyle: "italic", fontWeight: 400, fontSize: "0.85em", color: DOC.meta, letterSpacing: 0, textTransform: "none", lineHeight: 1 }}>| Content Plan</span>
          </div>
          <div style={{ fontFamily: DISP, fontWeight: 400, fontSize: 38, color: DOC.text, lineHeight: 1, textTransform: "uppercase", letterSpacing: 0.5 }}>{cpClientName}</div>
        </div>
        <div style={{ display: "flex", gap: 24, marginBottom: 24, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={DOC_LABEL}>Shoot Date</label>
            {editable ? (
              <input
                type="date"
                value={cpShootDate === "PENDING" ? "" : cpShootDate}
                onChange={e => setCpShootDate(e.target.value || "PENDING")}
                style={{ ...DOC_INPUT, width: 170 }}
              />
            ) : (
              <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: DOC.text, lineHeight: 1, padding: "10px 0", letterSpacing: "1px" }}>{cpShootDate}</div>
            )}
          </div>
          <div>
            <label style={DOC_LABEL}>Produced</label>
            {editable ? (
              <input
                type="number"
                min={0}
                max={20}
                value={cpProducedCount}
                onChange={e => handleCountChange("produced", e.target.value)}
                style={{ ...DOC_INPUT, width: 80 }}
              />
            ) : (
              <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: DOC.text, lineHeight: 1, padding: "10px 0" }}>{cpProducedCount}</div>
            )}
          </div>
          <div>
            <label style={DOC_LABEL}>Organic</label>
            {editable ? (
              <input
                type="number"
                min={0}
                max={20}
                value={cpOrganicCount}
                onChange={e => handleCountChange("organic", e.target.value)}
                style={{ ...DOC_INPUT, width: 80 }}
              />
            ) : (
              <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: DOC.text, lineHeight: 1, padding: "10px 0" }}>{cpOrganicCount}</div>
            )}
          </div>
        </div>

        {/* Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${DOC.border}`, tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "25%" }} />
            <col style={{ width: "38%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "19%" }} />
          </colgroup>
          <thead>
            <tr style={{ background: DOC.cell }}>
              {["Link", "What's Needed", "Creator", "Approval"].map(h => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", color: DOC.text, fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", fontFamily: MONO, textTransform: "uppercase", lineHeight: 1, border: `1px solid ${DOC.borderStrong}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {producedItems.length > 0 && (
              <tr><td colSpan={4} style={{ background: DOC.cell, color: DOC.text, fontSize: 10, fontWeight: 800, letterSpacing: "1.5px", padding: "7px 14px", fontFamily: MONO, textTransform: "uppercase", lineHeight: 1, borderTop: `1px solid ${DOC.borderStrong}`, borderBottom: `1px solid ${DOC.borderStrong}` }}>Produced Videos</td></tr>
            )}
            {producedItems.map((item, idx) => renderRow(item, idx, editable))}
            {organicItems.length > 0 && (
              <tr><td colSpan={4} style={{ background: DOC.cell, color: DOC.text, fontSize: 10, fontWeight: 800, letterSpacing: "1.5px", padding: "7px 14px", fontFamily: MONO, textTransform: "uppercase", lineHeight: 1, borderTop: `1px solid ${DOC.borderStrong}`, borderBottom: `1px solid ${DOC.borderStrong}` }}>Organic Videos</td></tr>
            )}
            {organicItems.map((item, idx) => renderRow(item, idx, editable))}
          </tbody>
        </table>

        {/* Shot Plan / References */}
        {showReferences && (
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${DOC.border}` }}>
            {(cpReferenceImages?.length > 0) ? (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: DOC.meta, letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: MONO, lineHeight: 1 }}>Shot Plan / References</div>
                  {editable && (
                    <button onClick={() => setPinterestOpen(o => !o)} style={{ background: "none", border: "none", fontSize: 10, color: PINTEREST_RED, cursor: "pointer", fontWeight: 700, padding: 0, lineHeight: 1, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "1.5px" }}>
                      {pinterestOpen ? "Close Panel" : "+ Add More"}
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {cpReferenceImages.map((url, i) => editable ? (
                    <div key={i} style={{ position: "relative" }}
                      onMouseEnter={e => { const btn = e.currentTarget.querySelector("button"); if (btn) btn.style.display = "flex"; }}
                      onMouseLeave={e => { const btn = e.currentTarget.querySelector("button"); if (btn) btn.style.display = "none"; }}
                    >
                      <img src={url} alt="" style={{ width: 120, height: "auto", borderRadius: 8, display: "block" }} />
                      <button
                        onClick={() => removeCPReferenceImage(i)}
                        style={{ display: "none", position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.65)", border: "none", color: "white", borderRadius: "50%", width: 20, height: 20, fontSize: 11, cursor: "pointer", alignItems: "center", justifyContent: "center", padding: 0 }}
                      >×</button>
                    </div>
                  ) : (
                    <img key={i} src={url} alt="" style={{ width: 120, height: "auto", borderRadius: 8, display: "block" }} />
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <button
                  onClick={() => setPinterestOpen(true)}
                  style={{ background: "none", border: `1.5px dashed ${PINTEREST_RED}`, color: PINTEREST_RED, borderRadius: 8, padding: "10px 20px", fontSize: 11, fontWeight: 700, cursor: "pointer", lineHeight: 1, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "1.5px" }}
                >
                  📌 Add Pinterest References
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.canvas, minHeight: "100vh", fontFamily: SANS }}>
      {/* Header */}
      <div style={PAGE_HEADER}>
        <button onClick={backAction} style={ghostBtn}>{backLabel}</button>
        <div style={{ width: 1, height: 18, background: C.border }} />
        <div style={PAGE_TITLE}>Content Plan Creator</div>
        {currentCPId && (
          <div style={{ fontSize: 13, color: C.meta, lineHeight: 1 }}>
            {cpClientName} — {MONTHS[cpMonth]} {cpYear}
          </div>
        )}
        <div style={{ flex: 1 }} />
      </div>

      {/* Step 2 — editable document */}
      {!onPreview && (
        <div style={DOC_PAGE_OUTER}>
          <div style={{ maxWidth: 900, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <div style={BTN_ROW}>
              <button onClick={() => saveContentPlan(false)} disabled={cpSaving} style={ghostBtn}>
                {cpSaving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => { saveContentPlan(true); setActiveCPStep(3); }} style={primaryBtn}>Preview & Export →</button>
            </div>
          </div>
          {renderPlanDocument(true)}
          <PinterestPanel
            isOpen={pinterestOpen}
            onClose={() => setPinterestOpen(false)}
            onAddImages={addCPReferenceImages}
            width={pinterestPanelWidth}
            onWidthChange={setPinterestPanelWidth}
            pinterestToken={pinterestToken}
            onTokenReceived={setPinterestToken}
          />
        </div>
      )}

      {/* Step 3 — read-only preview */}
      {onPreview && cpItems.length > 0 && (
        <div style={DOC_PAGE_OUTER}>
          <div style={{ maxWidth: 900, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <div style={BTN_ROW}>
              <button
                onClick={async () => {
                  if (!currentCPId) { await saveContentPlan(true); }
                  if (!currentCPId) { showToast("Please save the plan first", "error"); return; }
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const res = await fetch("/api/export-content-plan-pdf", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                      body: JSON.stringify({ planId: currentCPId }),
                    });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json.error || "Export failed");
                    const bytes = Uint8Array.from(atob(json.pdf), c => c.charCodeAt(0));
                    const blob = new Blob([bytes], { type: "application/pdf" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = json.filename || "content-plan.pdf"; a.click();
                    URL.revokeObjectURL(url);
                  } catch (e) { showToast(e.message, "error"); }
                }}
                style={ghostBtn}
              >Export PDF</button>
              <button
                onClick={async () => {
                  if (!currentCPId) { await saveContentPlan(true); }
                  if (!currentCPId) { showToast("Please save the plan first", "error"); return; }
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const res = await fetch("/api/export-content-plan-docx", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                      body: JSON.stringify({ planId: currentCPId }),
                    });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json.error || "Export failed");
                    const bytes = Uint8Array.from(atob(json.docx), c => c.charCodeAt(0));
                    const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = json.filename || "content-plan.docx"; a.click();
                    URL.revokeObjectURL(url);
                  } catch (e) { showToast(e.message, "error"); }
                }}
                style={ghostBtn}
              >Export DOCX</button>
              <button
                onClick={async () => {
                  try {
                    const planId = currentCPId || await saveContentPlan(false);
                    if (!planId) { showToast("Save the plan first", "error"); return; }
                    await getOrCreateShareToken(planId);
                  } catch { showToast("Failed to generate share link", "error"); }
                }}
                style={primaryBtn}
              >Share with Client</button>
            </div>
          </div>
          {renderPlanDocument(false)}
        </div>
      )}

      {/* Destructive trim confirmation */}
      <AppDialog
        open={trimConfirm !== null}
        onClose={() => setTrimConfirm(null)}
        title="Remove filled rows?"
      >
        {trimConfirm && (
          <div>
            <div style={{ fontSize: 13, color: C.meta, marginBottom: 20, lineHeight: 1.5 }}>
              Reducing {trimConfirm.kind} count will remove {trimConfirm.count} row{trimConfirm.count !== 1 ? "s" : ""} that already {trimConfirm.count !== 1 ? "have" : "has"} content. This can't be undone.
            </div>
            <div style={BTN_ROW}>
              <button onClick={() => setTrimConfirm(null)} style={ghostBtn}>Cancel</button>
              <button
                onClick={() => { trimConfirm.apply(); setTrimConfirm(null); }}
                style={dangerBtn}
              >Remove rows</button>
            </div>
          </div>
        )}
      </AppDialog>

      {/* Share / Send Modal */}
      {cpShareModal && (() => {
        const client = cpShareModal.client;
        const methods = [
          { value: "email", label: "Email ✉️" },
          { value: "sms",   label: "SMS 💬" },
          { value: "both",  label: "Both 📨" },
        ];
        const activeMethod = methods.find(m => m.value === cpShareMethod);
        return (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) { setCpShareModal(null); setOverridePhone(null); setOverrideEmail(null); } }}
          >
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, width: 460, padding: 32, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 2, lineHeight: 1 }}>Send Content Plan</div>
              <div style={{ fontSize: 12, color: C.meta, marginBottom: 20, lineHeight: 1 }}>{cpClientName} — {MONTHS[cpMonth]} {cpYear}</div>

              <div style={{ fontSize: 10, fontWeight: 700, color: C.meta, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8, fontFamily: MONO, lineHeight: 1 }}>Public link (no login required)</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                <input readOnly value={cpShareModal.url} style={{ ...INPUT, flex: 1 }} />
                <button onClick={() => { navigator.clipboard.writeText(cpShareModal.url).then(() => showToast("Link copied!")); }} style={primaryBtn}>Copy</button>
              </div>

              {!client ? (
                <div style={{ fontSize: 13, color: C.meta, marginBottom: 20, lineHeight: 1 }}>No client linked — link a client to enable direct send.</div>
              ) : (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.meta, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10, fontFamily: MONO, lineHeight: 1 }}>Deliver via</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    {methods.map(m => (
                      <button
                        key={m.value}
                        onClick={() => { setCpShareMethod(m.value); setCpShareError(""); setCpShareSuccess(""); }}
                        style={{ flex: 1, padding: "10px 0", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", border: `1.5px solid ${cpShareMethod === m.value ? C.accent : C.border}`, background: cpShareMethod === m.value ? C.accent : C.surface2, color: cpShareMethod === m.value ? "#000" : C.meta, fontFamily: MONO, lineHeight: 1 }}
                      >{m.label}</button>
                    ))}
                  </div>
                  {activeMethod && (
                    <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                      {(cpShareMethod === "email" || cpShareMethod === "both") && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.meta, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 5, fontFamily: MONO, lineHeight: 1 }}>Send email to</div>
                          <input
                            type="email"
                            value={overrideEmail !== null ? overrideEmail : (client?.email || "")}
                            onChange={e => setOverrideEmail(e.target.value)}
                            placeholder="Email address..."
                            style={INPUT}
                          />
                          {overrideEmail !== null && overrideEmail !== client?.email && (
                            <div style={{ fontSize: 11, color: C.error, marginTop: 3, lineHeight: 1 }}>Using override — client's saved email unchanged</div>
                          )}
                        </div>
                      )}
                      {(cpShareMethod === "sms" || cpShareMethod === "both") && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.meta, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 5, fontFamily: MONO, lineHeight: 1 }}>Send SMS to</div>
                          <input
                            type="tel"
                            value={overridePhone !== null ? overridePhone : (client?.phone || "")}
                            onChange={e => setOverridePhone(e.target.value)}
                            placeholder="Phone number..."
                            style={INPUT}
                          />
                          {overridePhone !== null && overridePhone !== client?.phone && (
                            <div style={{ fontSize: 11, color: C.error, marginTop: 3, lineHeight: 1 }}>Using override — client's saved number unchanged</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {cpShareSuccess && <div style={{ fontSize: 13, color: C.accent, fontWeight: 700, marginBottom: 10, lineHeight: 1 }}>{cpShareSuccess}</div>}
                  {cpShareError && <div style={{ fontSize: 12, color: C.error, marginBottom: 10, lineHeight: 1 }}>{cpShareError}</div>}
                  <div style={BTN_ROW}>
                    <button
                      onClick={() => doSendContentPlan(overridePhone, overrideEmail)}
                      disabled={cpShareBusy}
                      style={{ ...primaryBtn, opacity: cpShareBusy ? 0.6 : 1, cursor: cpShareBusy ? "default" : "pointer" }}
                    >
                      {cpShareBusy ? "Sending..." : `Send via ${cpShareMethod === "both" ? "Email & SMS" : cpShareMethod === "email" ? "Email" : "SMS"}`}
                    </button>
                    <button onClick={() => { setCpShareModal(null); setOverridePhone(null); setOverrideEmail(null); }} style={ghostBtn}>Close</button>
                  </div>
                </>
              )}
              {!client && (
                <div style={{ textAlign: "right", marginTop: 16 }}>
                  <button onClick={() => setCpShareModal(null)} style={ghostBtn}>Close</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
