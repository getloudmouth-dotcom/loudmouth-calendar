import { supabase } from "../supabase";
import { MONTHS } from "../constants";
import { useApp } from "../AppContext";
import { useState, useEffect } from "react";
import PinterestPanel from "../components/PinterestPanel";

import { SANS, MONO, C, INPUT, LABEL, primaryBtn, ghostBtn, PAGE_HEADER, PAGE_TITLE } from "../theme";

const approvalStyle = status => ({
  background: status === "approved" ? "rgba(204,255,0,0.1)" : status === "denied" ? "rgba(255,68,68,0.12)" : C.surface2,
  color: status === "approved" ? C.accent : status === "denied" ? "#ff6b6b" : C.meta,
  borderColor: status === "approved" ? C.accent : status === "denied" ? "#ff6b6b" : C.border,
});

export default function ContentPlanPortal({
  currentCPId, setCurrentCPId,
  activeCPStep, setActiveCPStep,
  cpClientName, setCpClientName,
  cpClientId, setCpClientId,
  cpMonth, setCpMonth,
  cpYear, setCpYear,
  cpShootDate, setCpShootDate,
  cpProducedCount, setCpProducedCount,
  cpOrganicCount, setCpOrganicCount,
  cpItems, setCpItems,
  cpSaving,
  allContentPlans,
  clients,
  addingClient, setAddingClient,
  newClientInput, setNewClientInput,
  newContentPlan, openContentPlan, saveContentPlan, deleteContentPlan, generateCPItems, updateCPItem,
  getOrCreateShareToken,
  cpShareModal, setCpShareModal,
  cpShareEmail, setCpShareEmail,
  cpShareMethod, setCpShareMethod,
  cpShareBusy, setCpShareBusy,
  cpShareError, setCpShareError,
  cpShareSuccess, setCpShareSuccess,
  doSendContentPlan,
  cpReferenceImages, addCPReferenceImages, removeCPReferenceImage,
  pinterestToken, setPinterestToken,
  pinterestOpen, setPinterestOpen,
  pinterestPanelWidth, setPinterestPanelWidth,
  setActivePortal,
}) {
  const { showToast, user } = useApp();
  const [creators, setCreators] = useState([]);
  const [overridePhone, setOverridePhone] = useState(null);
  const [overrideEmail, setOverrideEmail] = useState(null);

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

  const onPlansList = !currentCPId && activeCPStep === null;
  const onSetup = !currentCPId && activeCPStep === 1;
  const onPreview = activeCPStep === 3;
  const backLabel = onPlansList ? "← Home" : onPreview ? "← Back" : "← Plans";
  const backAction = onPlansList
    ? () => { setActivePortal(null); }
    : onSetup
    ? () => { setActiveCPStep(null); }
    : onPreview
    ? () => { setActiveCPStep(2); }
    : () => { setCurrentCPId(null); setActiveCPStep(null); };

  return (
    <div style={{ background: C.canvas, minHeight: "100vh", fontFamily: SANS }}>
      {/* Header */}
      <div style={PAGE_HEADER}>
        {!onPlansList && (
          <>
            <button onClick={backAction} style={ghostBtn}>{backLabel}</button>
            <div style={{ width: 1, height: 18, background: C.border }} />
          </>
        )}
        <div style={PAGE_TITLE}>Content Plan Creator</div>
        {currentCPId && (
          <div style={{ fontSize: 13, color: C.meta, lineHeight: 1 }}>
            {cpClientName} — {MONTHS[cpMonth]} {cpYear}
          </div>
        )}
        <div style={{ flex: 1 }} />
      </div>

      <div style={{ padding: "36px 48px", maxWidth: 1100 }}>

        {/* Plan list */}
        {!currentCPId && activeCPStep === null && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: -0.5 }}>Content Plans</div>
                <div style={{ marginTop: 8, fontFamily: SANS, fontSize: 13, color: C.meta }}>{allContentPlans.length} plan{allContentPlans.length !== 1 ? "s" : ""}</div>
              </div>
            </div>
            {allContentPlans.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8, lineHeight: 1 }}>No content plans yet</div>
                <div style={{ fontSize: 13, color: C.meta, marginBottom: 24, lineHeight: 1 }}>Create your first plan to get started</div>
                <button onClick={() => newContentPlan()} style={primaryBtn}>+ New Plan</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                {allContentPlans.map(plan => (
                  <div
                    key={plan.id}
                    onClick={() => openContentPlan(plan)}
                    style={{ position: "relative", background: C.surface, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, cursor: "pointer", transition: "border-color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                  >
                    {plan.user_id === user?.id && (
                      <button
                        onClick={e => { e.stopPropagation(); deleteContentPlan(plan); }}
                        style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: C.meta, fontSize: 16, padding: 0, lineHeight: 1 }}
                        title="Delete plan"
                      >🗑</button>
                    )}
                    <div style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 4, lineHeight: 1 }}>{plan.client_name}</div>
                    <div style={{ fontSize: 13, color: C.meta, marginBottom: 12, lineHeight: 1 }}>{MONTHS[plan.month]} {plan.year}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, borderRadius: 20, padding: "2px 7px", lineHeight: 1,
                        fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.5px",
                        color: plan.shoot_date === "PENDING" ? "#ff6b6b" : "#7fd99e",
                        background: plan.shoot_date === "PENDING" ? "rgba(255,68,68,0.12)" : "rgba(127,217,158,0.12)",
                      }}>
                        {plan.shoot_date === "PENDING" ? "Shoot Pending" : `Shoot: ${plan.shoot_date}`}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: C.meta, marginTop: 10, fontFamily: MONO, lineHeight: 1, opacity: 0.7 }}>
                      Saved {new Date(plan.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {plan.last_updated_by && ` · ${plan.last_updated_by}`}
                    </div>
                  </div>
                ))}
                <div onClick={() => newContentPlan()}
                  style={{ border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", minHeight: 68, transition: "all 0.15s", color: C.meta }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = C.meta; }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px" }}>New Plan</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Setup */}
        {currentCPId === null && activeCPStep === 1 && (
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: -0.5 }}>New Content Plan</div>
              <div style={{ marginTop: 8, fontFamily: SANS, fontSize: 13, color: C.meta }}>Set up the basics for this content plan.</div>
            </div>

            <label style={LABEL}>Client</label>
            <div style={{ marginBottom: 16 }}>
              <select
                value={cpClientId || ""}
                onChange={e => {
                  const c = clients.find(c => c.id === e.target.value);
                  setCpClientId(e.target.value || null);
                  setCpClientName(c?.name || "");
                }}
                style={{ ...INPUT, appearance: "none" }}
              >
                <option value="">Select a client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {clients.length === 0 && (
                <div style={{ fontSize: 11, color: C.meta, marginTop: 6, lineHeight: 1 }}>No clients yet — add them in Billing first.</div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={LABEL}>Month</label>
                <select value={cpMonth} onChange={e => setCpMonth(Number(e.target.value))} style={{ ...INPUT, appearance: "none" }}>
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
              <div style={{ width: 100 }}>
                <label style={LABEL}>Year</label>
                <input type="number" value={cpYear} onChange={e => setCpYear(Number(e.target.value))} style={INPUT} min={2020} max={2035} />
              </div>
            </div>

            <label style={LABEL}>Shoot Date</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
              <button
                onClick={() => setCpShootDate("PENDING")}
                style={cpShootDate === "PENDING" ? primaryBtn : ghostBtn}
              >Pending</button>
              <input type="date" value={cpShootDate === "PENDING" ? "" : cpShootDate} onChange={e => setCpShootDate(e.target.value || "PENDING")} style={{ ...INPUT, flex: 1 }} />
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
              <div style={{ flex: 1 }}>
                <label style={LABEL}>Produced Videos</label>
                <input type="number" value={cpProducedCount} onChange={e => setCpProducedCount(Math.max(0, Math.min(20, Number(e.target.value))))} style={INPUT} min={0} max={20} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={LABEL}>Organic Videos</label>
                <input type="number" value={cpOrganicCount} onChange={e => setCpOrganicCount(Math.max(0, Math.min(20, Number(e.target.value))))} style={INPUT} min={0} max={20} />
              </div>
            </div>

            <button
              onClick={() => {
                if (!cpClientId) { showToast("Please select a client", "error"); return; }
                const duplicate = allContentPlans.find(p => p.client_id === cpClientId && p.month === cpMonth && p.year === cpYear);
                if (duplicate) { showToast(`A content plan for ${cpClientName} — ${MONTHS[cpMonth]} ${cpYear} already exists`, "error"); return; }
                const items = generateCPItems(cpProducedCount, cpOrganicCount);
                setCpItems(items);
                setActiveCPStep(2);
              }}
              style={{ ...primaryBtn, width: "100%", textAlign: "center" }}
              disabled={!cpClientId || (cpProducedCount === 0 && cpOrganicCount === 0)}
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Build Plan */}
        {currentCPId !== null || activeCPStep === 2 ? (() => {
          const shouldShowStep2 = (currentCPId !== null && activeCPStep !== 3) || (currentCPId === null && activeCPStep === 2);
          if (!shouldShowStep2) return null;
          const producedItems = cpItems.filter(it => it.item_type === "produced");
          const organicItems = cpItems.filter(it => it.item_type === "organic");
          return (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: C.text, lineHeight: 1 }}>{cpClientName} — {MONTHS[cpMonth]} {cpYear}</div>
                  <div style={{ fontSize: 12, color: C.meta, marginTop: 6, fontFamily: MONO, lineHeight: 1 }}>Shoot: {cpShootDate}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => saveContentPlan(false)} disabled={cpSaving} style={ghostBtn}>
                    {cpSaving ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => setActiveCPStep(3)} style={primaryBtn}>Preview & Export →</button>
                </div>
              </div>

              <div style={{ overflowX: "auto", marginBottom: 24 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: C.surface, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "25%" }} />
                    <col style={{ width: "38%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "19%" }} />
                  </colgroup>
                  <thead>
                    <tr style={{ background: C.canvas }}>
                      {["Link", "What's Needed", "Creator", "Approval"].map(h => (
                        <th key={h} style={{ padding: "11px 14px", textAlign: "left", color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", fontFamily: MONO, textTransform: "uppercase", lineHeight: 1, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {producedItems.length > 0 && (
                      <tr><td colSpan={4} style={{ background: C.canvas, color: C.accent, fontSize: 10, fontWeight: 800, letterSpacing: "1.5px", padding: "7px 14px", fontFamily: MONO, textTransform: "uppercase", lineHeight: 1 }}>Produced Videos</td></tr>
                    )}
                    {producedItems.map((item, idx) => (
                      <tr key={item._localId} style={{ borderBottom: `1px solid ${C.border}`, background: idx % 2 === 0 ? C.surface : C.surface2 }}>
                        <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: C.meta, letterSpacing: "1px", marginBottom: 4, fontFamily: MONO, lineHeight: 1 }}>#{item.item_number}</div>
                          <input type="url" value={item.reference_link} onChange={e => updateCPItem(item._localId, "reference_link", e.target.value)} placeholder="Paste Link" style={{ width: "100%", fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 8px", outline: "none", boxSizing: "border-box", background: C.canvas, color: C.text, fontFamily: SANS, lineHeight: 1 }} />
                        </td>
                        <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                          <textarea value={item.whats_needed} onChange={e => updateCPItem(item._localId, "whats_needed", e.target.value)} placeholder="Props, people, description..." rows={3} style={{ width: "100%", fontSize: 12, border: "none", outline: "none", background: "transparent", color: C.text, padding: 0, resize: "vertical", fontFamily: SANS, lineHeight: 1.5, boxSizing: "border-box" }} />
                        </td>
                        <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                          <select value={item.creator_name} onChange={e => updateCPItem(item._localId, "creator_name", e.target.value)} style={{ width: "100%", fontSize: 12, fontWeight: 600, border: "none", outline: "none", background: "transparent", color: C.text, padding: 0, boxSizing: "border-box", cursor: "pointer", fontFamily: SANS, lineHeight: 1 }}>
                            <option value="">— Select —</option>
                            {creators.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                          <select value={item.approval_status} onChange={e => updateCPItem(item._localId, "approval_status", e.target.value)} style={{ width: "100%", fontSize: 11, fontWeight: 700, border: "1.5px solid", borderRadius: 20, padding: "4px 8px", outline: "none", cursor: "pointer", fontFamily: MONO, lineHeight: 1, ...approvalStyle(item.approval_status) }}>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="denied">Denied</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {organicItems.length > 0 && (
                      <tr><td colSpan={4} style={{ background: C.canvas, color: C.accent, fontSize: 10, fontWeight: 800, letterSpacing: "1.5px", padding: "7px 14px", fontFamily: MONO, textTransform: "uppercase", lineHeight: 1 }}>Organic Videos</td></tr>
                    )}
                    {organicItems.map((item, idx) => (
                      <tr key={item._localId} style={{ borderBottom: `1px solid ${C.border}`, background: idx % 2 === 0 ? C.surface : C.surface2 }}>
                        <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: C.meta, letterSpacing: "1px", marginBottom: 4, fontFamily: MONO, lineHeight: 1 }}>#{item.item_number}</div>
                          <input type="url" value={item.reference_link} onChange={e => updateCPItem(item._localId, "reference_link", e.target.value)} placeholder="Paste Link" style={{ width: "100%", fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 8px", outline: "none", boxSizing: "border-box", background: C.canvas, color: C.text, fontFamily: SANS, lineHeight: 1 }} />
                        </td>
                        <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                          <textarea value={item.whats_needed} onChange={e => updateCPItem(item._localId, "whats_needed", e.target.value)} placeholder="Props, people, description..." rows={3} style={{ width: "100%", fontSize: 12, border: "none", outline: "none", background: "transparent", color: C.text, padding: 0, resize: "vertical", fontFamily: SANS, lineHeight: 1.5, boxSizing: "border-box" }} />
                        </td>
                        <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                          <select value={item.creator_name} onChange={e => updateCPItem(item._localId, "creator_name", e.target.value)} style={{ width: "100%", fontSize: 12, fontWeight: 600, border: "none", outline: "none", background: "transparent", color: C.text, padding: 0, boxSizing: "border-box", cursor: "pointer", fontFamily: SANS, lineHeight: 1 }}>
                            <option value="">— Select —</option>
                            {creators.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                          <select value={item.approval_status} onChange={e => updateCPItem(item._localId, "approval_status", e.target.value)} style={{ width: "100%", fontSize: 11, fontWeight: 700, border: "1.5px solid", borderRadius: 20, padding: "4px 8px", outline: "none", cursor: "pointer", fontFamily: MONO, lineHeight: 1, ...approvalStyle(item.approval_status) }}>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="denied">Denied</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setCurrentCPId(null); setActiveCPStep(null); }} style={ghostBtn}>← Plans</button>
                <div style={{ flex: 1 }} />
                <button onClick={() => { saveContentPlan(true); setActiveCPStep(3); }} style={primaryBtn}>Preview & Export →</button>
              </div>

              {/* Shot Plan / References */}
              {cpReferenceImages?.length > 0 ? (
                <div style={{ marginTop: 32, borderTop: `1px solid ${C.border}`, paddingTop: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.meta, letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: MONO, lineHeight: 1 }}>Shot Plan / References</div>
                    <button onClick={() => setPinterestOpen(o => !o)} style={{ background: "none", border: "none", fontSize: 11, color: "#E60023", cursor: "pointer", fontWeight: 700, padding: 0, lineHeight: 1 }}>
                      {pinterestOpen ? "Close Panel" : "+ Add More"}
                    </button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {cpReferenceImages.map((url, i) => (
                      <div key={i} style={{ position: "relative" }}
                        onMouseEnter={e => e.currentTarget.querySelector("button").style.display = "flex"}
                        onMouseLeave={e => e.currentTarget.querySelector("button").style.display = "none"}
                      >
                        <img src={url} alt="" style={{ width: 120, height: "auto", borderRadius: 8, display: "block" }} />
                        <button
                          onClick={() => removeCPReferenceImage(i)}
                          style={{ display: "none", position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.65)", border: "none", color: "white", borderRadius: "50%", width: 20, height: 20, fontSize: 11, cursor: "pointer", alignItems: "center", justifyContent: "center", padding: 0 }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 24, textAlign: "center", padding: "16px 0" }}>
                  <button onClick={() => setPinterestOpen(true)} style={{ background: "none", border: "1.5px dashed #E60023", color: "#E60023", borderRadius: 8, padding: "10px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer", lineHeight: 1 }}>
                    📌 Add Pinterest References
                  </button>
                </div>
              )}

              <PinterestPanel
                isOpen={pinterestOpen}
                onClose={() => setPinterestOpen(false)}
                onAddImages={addCPReferenceImages}
                width={pinterestPanelWidth}
                onWidthChange={setPinterestPanelWidth}
                pinterestToken={pinterestToken}
                onTokenReceived={setPinterestToken}
                showToast={showToast}
              />
            </div>
          );
        })() : null}

        {/* Step 3: Preview & Export */}
        {activeCPStep === 3 && cpItems.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: C.text, lineHeight: 1 }}>Preview — {cpClientName} / {MONTHS[cpMonth]} {cpYear}</div>
                <div style={{ fontSize: 12, color: C.meta, marginTop: 6, fontFamily: MONO, lineHeight: 1 }}>Shoot: {cpShootDate}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setActiveCPStep(2)} style={ghostBtn}>← Edit</button>
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
                    } catch (e) { showToast("Failed to generate share link", "error"); }
                  }}
                  style={primaryBtn}
                >Share with Client</button>
              </div>
            </div>

            {/* Preview table */}
            <div style={{ overflowX: "auto", background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "0.04em", color: C.text, lineHeight: 1 }}>{cpClientName.toUpperCase()} CONTENT PLAN</div>
                <div style={{ fontSize: 12, color: C.meta, marginTop: 6, fontWeight: 600, fontFamily: MONO, lineHeight: 1 }}>SHOOT DATE: {cpShootDate}</div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <colgroup>
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "38%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "14%" }} />
                </colgroup>
                <thead>
                  <tr style={{ background: C.canvas }}>
                    {["Reference", "What's Needed", "Creator", "Approval"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", fontFamily: MONO, textTransform: "uppercase", lineHeight: 1, border: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cpItems.filter(it => it.item_type === "produced").length > 0 && (
                    <tr><td colSpan={4} style={{ background: C.canvas, color: C.accent, fontSize: 10, fontWeight: 800, letterSpacing: "1.5px", padding: "7px 14px", fontFamily: MONO, textTransform: "uppercase", lineHeight: 1 }}>Produced Videos</td></tr>
                  )}
                  {cpItems.filter(it => it.item_type === "produced").map(item => (
                    <tr key={item._localId} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "12px 14px", verticalAlign: "top", border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: C.meta, letterSpacing: "1px", fontFamily: MONO, lineHeight: 1 }}>Produced #{item.item_number}</div>
                        {item.reference_link ? <a href={item.reference_link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.accent, fontWeight: 600, marginTop: 4, display: "block", lineHeight: 1 }}>LINK ↗</a> : <span style={{ color: C.meta, fontSize: 12, marginTop: 4, display: "block", lineHeight: 1 }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 14px", verticalAlign: "top", fontSize: 12, color: C.text, lineHeight: 1.5, border: `1px solid ${C.border}` }}>{item.whats_needed || "—"}</td>
                      <td style={{ padding: "12px 14px", verticalAlign: "top", fontSize: 13, fontWeight: 700, color: C.text, border: `1px solid ${C.border}`, lineHeight: 1 }}>{item.creator_name || "—"}</td>
                      <td style={{ padding: "12px 14px", verticalAlign: "top", border: `1px solid ${C.border}` }}>
                        <span style={{ borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, fontFamily: MONO, lineHeight: 1, ...approvalStyle(item.approval_status) }}>
                          {item.approval_status === "approved" ? "Approved" : item.approval_status === "denied" ? "Denied" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {cpItems.filter(it => it.item_type === "organic").length > 0 && (
                    <tr><td colSpan={4} style={{ background: C.canvas, color: C.accent, fontSize: 10, fontWeight: 800, letterSpacing: "1.5px", padding: "7px 14px", fontFamily: MONO, textTransform: "uppercase", lineHeight: 1 }}>Organic Videos</td></tr>
                  )}
                  {cpItems.filter(it => it.item_type === "organic").map(item => (
                    <tr key={item._localId} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "12px 14px", verticalAlign: "top", border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: C.meta, letterSpacing: "1px", fontFamily: MONO, lineHeight: 1 }}>Organic #{item.item_number}</div>
                        {item.reference_link ? <a href={item.reference_link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.accent, fontWeight: 600, marginTop: 4, display: "block", lineHeight: 1 }}>LINK ↗</a> : <span style={{ color: C.meta, fontSize: 12, marginTop: 4, display: "block", lineHeight: 1 }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 14px", verticalAlign: "top", fontSize: 12, color: C.text, lineHeight: 1.5, border: `1px solid ${C.border}` }}>{item.whats_needed || "—"}</td>
                      <td style={{ padding: "12px 14px", verticalAlign: "top", fontSize: 13, fontWeight: 700, color: C.text, border: `1px solid ${C.border}`, lineHeight: 1 }}>{item.creator_name || "—"}</td>
                      <td style={{ padding: "12px 14px", verticalAlign: "top", border: `1px solid ${C.border}` }}>
                        <span style={{ borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, fontFamily: MONO, lineHeight: 1, ...approvalStyle(item.approval_status) }}>
                          {item.approval_status === "approved" ? "Approved" : item.approval_status === "denied" ? "Denied" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {cpReferenceImages?.length > 0 && (
                <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.meta, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 14, fontFamily: MONO, lineHeight: 1 }}>Shot Plan / References</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {cpReferenceImages.map((url, i) => (
                      <img key={i} src={url} alt="" style={{ width: 120, height: "auto", borderRadius: 8, display: "block" }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => doSendContentPlan(overridePhone, overrideEmail)}
                      disabled={cpShareBusy}
                      style={{ ...primaryBtn, flex: 1, padding: "11px 0", opacity: cpShareBusy ? 0.6 : 1, cursor: cpShareBusy ? "default" : "pointer" }}
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
