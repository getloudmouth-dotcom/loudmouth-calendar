import { supabase } from "../supabase";
import { MONTHS } from "../constants";
import { labelStyle, inputStyle, primaryBtn, secondaryBtn } from "../styles";
import { useApp } from "../AppContext";
import { useState, useEffect } from "react";
import PinterestPanel from "../components/PinterestPanel";

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
  const [showCreatorMgmt, setShowCreatorMgmt] = useState(false);
  const [newCreatorName, setNewCreatorName] = useState("");
  const [creatorLoading, setCreatorLoading] = useState(false);

  useEffect(() => {
    const fetchCreators = async () => {
      const { data, error } = await supabase
        .from("content_creators")
        .select("*")
        .order("name");
      if (!error && data) setCreators(data);
    };
    fetchCreators();
  }, []);

  const addCreator = async () => {
    if (!newCreatorName.trim()) return;
    setCreatorLoading(true);
    const { data, error } = await supabase
      .from("content_creators")
      .insert({ name: newCreatorName.trim() })
      .select();
    if (!error && data) {
      setCreators(prev => [...prev, ...data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCreatorName("");
      showToast("Creator added", "success");
    } else {
      showToast("Failed to add creator", "error");
    }
    setCreatorLoading(false);
  };

  const deleteCreator = async (id) => {
    setCreatorLoading(true);
    const { error } = await supabase
      .from("content_creators")
      .delete()
      .eq("id", id);
    if (!error) {
      setCreators(prev => prev.filter(c => c.id !== id));
      showToast("Creator deleted", "success");
    } else {
      showToast("Failed to delete creator", "error");
    }
    setCreatorLoading(false);
  };

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
    <div>
      {/* ── Content Plan Creator portal ── */}
      <div style={{ padding: "20px 40px", borderBottom: "1.5px solid #e8e8e8", display: "flex", alignItems: "center", gap: 16, background: "white" }}>
        <button onClick={backAction} style={{ background: "none", border: "none", fontSize: 13, color: "#888", cursor: "pointer", padding: "6px 0", fontWeight: 600 }}>{backLabel}</button>
        <div style={{ width: 1, height: 18, background: "#e0e0e0" }} />
        <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e" }}>Content Plan Creator</div>
        {currentCPId && (
          <div style={{ fontSize: 13, color: "#aaa", fontWeight: 500 }}>
            {cpClientName} — {MONTHS[cpMonth]} {cpYear}
          </div>
        )}
        <div style={{ flex: 1 }} />
        {currentCPId && (
          <button onClick={() => { newContentPlan(); }} style={{ background: "#f0f0ee", color: "#555", border: "none", padding: "10px 18px", borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ New Plan</button>
        )}
      </div>
      <div style={{ padding: "36px 40px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Plan list (no active plan, not in setup) */}
        {!currentCPId && activeCPStep === null && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1a2e" }}>Content Plans</div>
                <div style={{ fontSize: 13, color: "#999", marginTop: 4 }}>{allContentPlans.length} plan{allContentPlans.length !== 1 ? "s" : ""}</div>
              </div>
              <button onClick={() => newContentPlan()} style={{ background: "#1a1a2e", color: "#D7FA06", border: "none", padding: "12px 24px", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", letterSpacing: "0.04em" }}>+ New Plan</button>
            </div>
            {allContentPlans.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#aaa" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No content plans yet</div>
                <div style={{ fontSize: 13, marginBottom: 24 }}>Create your first plan to get started</div>
                <button onClick={() => newContentPlan()} style={{ background: "#1a1a2e", color: "#D7FA06", border: "none", padding: "12px 28px", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>+ New Plan</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                {allContentPlans.map(plan => (
                  <div key={plan.id} onClick={() => openContentPlan(plan)} style={{ position: "relative", background: "white", borderRadius: 12, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: "1.5px solid #e8e8e8", cursor: "pointer" }}>
                    {plan.user_id === user?.id && (
                      <button
                        onClick={e => { e.stopPropagation(); deleteContentPlan(plan); }}
                        style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 16, padding: 0, lineHeight: 1 }}
                        title="Delete plan"
                      >🗑</button>
                    )}
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{plan.client_name}</div>
                    <div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>{MONTHS[plan.month]} {plan.year}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: plan.shoot_date === "PENDING" ? "#E8001C" : "#22aa66", fontWeight: 700, background: plan.shoot_date === "PENDING" ? "#ffe5e5" : "#e8f8e8", borderRadius: 5, padding: "3px 8px" }}>
                        {plan.shoot_date === "PENDING" ? "SHOOT PENDING" : `SHOOT: ${plan.shoot_date}`}
                      </span>
                      <span style={{ fontSize: 12, color: "#bbb" }}>{new Date(plan.updated_at).toLocaleDateString()}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#bbb", marginTop: 8 }}>
                      Last saved {new Date(plan.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {plan.last_updated_by && ` · ${plan.last_updated_by}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 1: Setup */}
        {currentCPId === null && activeCPStep === 1 && (
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <button
              onClick={() => setActiveCPStep(null)}
              style={{ background: "none", border: "none", fontSize: 13, color: "#888", cursor: "pointer", padding: "6px 0", fontWeight: 600, marginBottom: 20 }}
            >
              ← Back to Plans
            </button>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1a2e", marginBottom: 8 }}>New Content Plan</div>
            <div style={{ fontSize: 13, color: "#999", marginBottom: 28 }}>Set up the basics for this content plan.</div>
            <label style={labelStyle}>Client</label>
            <div style={{ marginBottom: 16 }}>
              <select
                value={cpClientId || ""}
                onChange={e => {
                  const c = clients.find(c => c.id === e.target.value);
                  setCpClientId(e.target.value || null);
                  setCpClientName(c?.name || "");
                }}
                style={{ ...inputStyle, width: "100%" }}
              >
                <option value="">Select a client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {clients.length === 0 && (
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>No clients yet — add them in Billing first.</div>
              )}
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Month</label>
                <select value={cpMonth} onChange={e => setCpMonth(Number(e.target.value))} style={inputStyle}>
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
              <div style={{ width: 100 }}>
                <label style={labelStyle}>Year</label>
                <input type="number" value={cpYear} onChange={e => setCpYear(Number(e.target.value))} style={inputStyle} min={2020} max={2035} />
              </div>
            </div>
            <label style={labelStyle}>Shoot Date</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
              <button onClick={() => setCpShootDate("PENDING")} style={{ ...cpShootDate === "PENDING" ? primaryBtn : secondaryBtn, padding: "8px 16px", fontSize: 12 }}>PENDING</button>
              <input type="date" value={cpShootDate === "PENDING" ? "" : cpShootDate} onChange={e => setCpShootDate(e.target.value || "PENDING")} style={{ ...inputStyle, flex: 1 }} placeholder="Or pick a date" />
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Produced Videos</label>
                <input type="number" value={cpProducedCount} onChange={e => setCpProducedCount(Math.max(0, Math.min(20, Number(e.target.value))))} style={inputStyle} min={0} max={20} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Organic Videos</label>
                <input type="number" value={cpOrganicCount} onChange={e => setCpOrganicCount(Math.max(0, Math.min(20, Number(e.target.value))))} style={inputStyle} min={0} max={20} />
              </div>
            </div>
            <button
              onClick={() => { if (!cpClientId) { showToast("Please select a client", "error"); return; } const duplicate = allContentPlans.find(p => p.client_id === cpClientId && p.month === cpMonth && p.year === cpYear); if (duplicate) { showToast(`A content plan for ${cpClientName} — ${MONTHS[cpMonth]} ${cpYear} already exists`, "error"); return; } const items = generateCPItems(cpProducedCount, cpOrganicCount); setCpItems(items); setActiveCPStep(2); }}
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
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e" }}>{cpClientName} — {MONTHS[cpMonth]} {cpYear}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>SHOOT DATE: {cpShootDate}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={() => setPinterestOpen(o => !o)}
                    style={{ background: pinterestOpen ? "#E60023" : "#f5f5f5", color: pinterestOpen ? "white" : "#E60023", border: "1.5px solid #E60023", padding: "10px 16px", borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    📌 {pinterestOpen ? "Close" : "References"}
                  </button>
                  <button onClick={() => saveContentPlan(false)} disabled={cpSaving} style={{ ...secondaryBtn, padding: "10px 18px" }}>
                    {cpSaving ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => setActiveCPStep(3)} style={{ ...primaryBtn, padding: "10px 18px" }}>Preview & Export →</button>
                </div>
              </div>
              <div style={{ overflowX: "auto", marginBottom: 24 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "22%" }} />
                    <col style={{ width: "28%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "8%" }} />
                  </colgroup>
                  <thead>
                    <tr style={{ background: "#1a1a2e" }}>
                      <th style={{ padding: "11px 14px", textAlign: "left", color: "#D7FA06", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>PRODUCED VIDEO</th>
                      <th style={{ padding: "11px 14px", textAlign: "left", color: "#D7FA06", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>WHAT'S NEEDED</th>
                      <th style={{ padding: "11px 14px", textAlign: "left", color: "#D7FA06", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
                        CREATOR
                        <button
                          onClick={() => setShowCreatorMgmt(true)}
                          style={{ background: "none", border: "none", color: "#D7FA06", cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}
                          title="Manage creators"
                        >
                          ⚙
                        </button>
                      </th>
                      <th style={{ padding: "11px 14px", textAlign: "left", color: "#D7FA06", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>APPROVAL</th>
                      <th style={{ padding: "11px 14px", textAlign: "left", color: "#D7FA06", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {producedItems.length > 0 && (
                      <tr><td colSpan={5} style={{ background: "#1a1a2e", color: "#D7FA06", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", padding: "7px 14px" }}>PRODUCED VIDEOS</td></tr>
                    )}
                    {producedItems.map((item, idx) => (
                      <tr key={item._localId} style={{ borderBottom: "1px solid #f0f0f0", background: idx % 2 === 0 ? "white" : "#fafaf8" }}>
                        <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: "#aaa", letterSpacing: "0.06em", marginBottom: 3 }}>PRODUCED VIDEO #{item.item_number}</div>
                          <input type="url" value={item.reference_link} onChange={e => updateCPItem(item._localId, "reference_link", e.target.value)} placeholder="Paste Link" style={{ width: "100%", fontSize: 11, border: "1.5px solid #e0e0e0", borderRadius: 6, padding: "5px 8px", outline: "none", boxSizing: "border-box" }} />
                        </td>
                        <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                          <textarea value={item.whats_needed} onChange={e => updateCPItem(item._localId, "whats_needed", e.target.value)} placeholder="Props, people, description..." rows={3} style={{ width: "100%", fontSize: 12, border: "none", outline: "none", background: "transparent", color: "#444", padding: 0, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box" }} />
                        </td>
                        <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                          <select value={item.creator_name} onChange={e => updateCPItem(item._localId, "creator_name", e.target.value)} style={{ width: "100%", fontSize: 12, fontWeight: 600, border: "none", outline: "none", background: "transparent", color: "#333", padding: 0, boxSizing: "border-box", cursor: "pointer" }}>
                            <option value="">— Select —</option>
                            {creators.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                          <select value={item.approval_status} onChange={e => updateCPItem(item._localId, "approval_status", e.target.value)} style={{ width: "100%", fontSize: 11, fontWeight: 700, border: "1.5px solid", borderRadius: 20, padding: "4px 8px", outline: "none", cursor: "pointer", background: item.approval_status === "approved" ? "#e8f8e8" : item.approval_status === "denied" ? "#ffe5e5" : "#f0f0ee", color: item.approval_status === "approved" ? "#22aa66" : item.approval_status === "denied" ? "#E8001C" : "#888", borderColor: item.approval_status === "approved" ? "#22aa66" : item.approval_status === "denied" ? "#E8001C" : "#ccc" }}>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="denied">Denied</option>
                          </select>
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center", verticalAlign: "middle" }}>
                          <span style={{ color: "#ddd", fontSize: 14 }}>···</span>
                        </td>
                      </tr>
                    ))}
                    {organicItems.length > 0 && (
                      <tr><td colSpan={5} style={{ background: "#1a1a2e", color: "#D7FA06", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", padding: "7px 14px" }}>ORGANIC VIDEOS</td></tr>
                    )}
                    {organicItems.map((item, idx) => (
                      <tr key={item._localId} style={{ borderBottom: "1px solid #f0f0f0", background: idx % 2 === 0 ? "white" : "#fafaf8" }}>
                        <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: "#aaa", letterSpacing: "0.06em", marginBottom: 3 }}>ORGANIC VIDEO #{item.item_number}</div>
                          <input type="url" value={item.reference_link} onChange={e => updateCPItem(item._localId, "reference_link", e.target.value)} placeholder="Paste Link" style={{ width: "100%", fontSize: 11, border: "1.5px solid #e0e0e0", borderRadius: 6, padding: "5px 8px", outline: "none", boxSizing: "border-box" }} />
                        </td>
                        <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                          <textarea value={item.whats_needed} onChange={e => updateCPItem(item._localId, "whats_needed", e.target.value)} placeholder="Props, people, description..." rows={3} style={{ width: "100%", fontSize: 12, border: "none", outline: "none", background: "transparent", color: "#444", padding: 0, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box" }} />
                        </td>
                        <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                          <select value={item.creator_name} onChange={e => updateCPItem(item._localId, "creator_name", e.target.value)} style={{ width: "100%", fontSize: 12, fontWeight: 600, border: "none", outline: "none", background: "transparent", color: "#333", padding: 0, boxSizing: "border-box", cursor: "pointer" }}>
                            <option value="">— Select —</option>
                            {creators.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                          <select value={item.approval_status} onChange={e => updateCPItem(item._localId, "approval_status", e.target.value)} style={{ width: "100%", fontSize: 11, fontWeight: 700, border: "1.5px solid", borderRadius: 20, padding: "4px 8px", outline: "none", cursor: "pointer", background: item.approval_status === "approved" ? "#e8f8e8" : item.approval_status === "denied" ? "#ffe5e5" : "#f0f0ee", color: item.approval_status === "approved" ? "#22aa66" : item.approval_status === "denied" ? "#E8001C" : "#888", borderColor: item.approval_status === "approved" ? "#22aa66" : item.approval_status === "denied" ? "#E8001C" : "#ccc" }}>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="denied">Denied</option>
                          </select>
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center", verticalAlign: "middle" }}>
                          <span style={{ color: "#ddd", fontSize: 14 }}>···</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setCurrentCPId(null); setActiveCPStep(null); }} style={{ ...secondaryBtn }}>← Plans</button>
                <div style={{ flex: 1 }} />
                <button onClick={() => { saveContentPlan(true); setActiveCPStep(3); }} style={{ ...primaryBtn }}>Preview & Export →</button>
              </div>

              {/* Shot Plan / References */}
              {cpReferenceImages?.length > 0 ? (
                <div style={{ marginTop: 32, borderTop: "1.5px solid #f0f0f0", paddingTop: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase" }}>📌 Shot Plan / References</div>
                    <button onClick={() => setPinterestOpen(o => !o)} style={{ background: "none", border: "none", fontSize: 11, color: "#E60023", cursor: "pointer", fontWeight: 700, padding: 0 }}>
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
                  <button onClick={() => setPinterestOpen(true)} style={{ background: "none", border: "1.5px dashed #E60023", color: "#E60023", borderRadius: 8, padding: "10px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    📌 Add Pinterest References
                  </button>
                </div>
              )}

              {/* Pinterest panel (position:fixed, DOM location doesn't matter) */}
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
                <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e" }}>Preview — {cpClientName} / {MONTHS[cpMonth]} {cpYear}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>SHOOT DATE: {cpShootDate}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setActiveCPStep(2)} style={{ ...secondaryBtn }}>← Edit</button>
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
                  style={{ ...secondaryBtn }}
                >
                  Export PDF
                </button>
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
                  style={{ ...secondaryBtn }}
                >
                  Export DOCX
                </button>
                <button
                  onClick={async () => {
                    try {
                      const planId = currentCPId || await saveContentPlan(false);
                      if (!planId) { showToast("Save the plan first", "error"); return; }
                      await getOrCreateShareToken(planId);
                    } catch (e) { showToast("Failed to generate share link", "error"); }
                  }}
                  style={{ ...primaryBtn }}
                >
                  Share with Client
                </button>
              </div>
            </div>
            {/* Preview table */}
            <div style={{ overflowX: "auto", background: "white", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "0.04em", color: "#1a1a2e" }}>{cpClientName.toUpperCase()} CONTENT PLAN</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 4, fontWeight: 600 }}>SHOOT DATE: {cpShootDate}</div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <colgroup>
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "38%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "14%" }} />
                </colgroup>
                <thead>
                  <tr style={{ background: "#1a1a2e" }}>
                    {["REFERENCE", "WHAT'S NEEDED", "CREATOR", "APPROVAL"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#D7FA06", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", border: "1px solid #333" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cpItems.filter(it => it.item_type === "produced").length > 0 && (
                    <tr><td colSpan={4} style={{ background: "#1a1a2e", color: "#D7FA06", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", padding: "7px 14px" }}>PRODUCED VIDEOS</td></tr>
                  )}
                  {cpItems.filter(it => it.item_type === "produced").map(item => (
                    <tr key={item._localId} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "12px 14px", verticalAlign: "top", border: "1px solid #eee" }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: "#aaa", letterSpacing: "0.06em" }}>PRODUCED VIDEO #{item.item_number}</div>
                        {item.reference_link ? <a href={item.reference_link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#1a1a2e", fontWeight: 600, marginTop: 3, display: "block" }}>LINK ↗</a> : <span style={{ color: "#ddd", fontSize: 12, marginTop: 3, display: "block" }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 14px", verticalAlign: "top", fontSize: 12, color: "#444", lineHeight: 1.5, border: "1px solid #eee" }}>{item.whats_needed || "—"}</td>
                      <td style={{ padding: "12px 14px", verticalAlign: "top", fontSize: 13, fontWeight: 700, color: "#333", border: "1px solid #eee" }}>{item.creator_name || "—"}</td>
                      <td style={{ padding: "12px 14px", verticalAlign: "top", border: "1px solid #eee" }}>
                        <span style={{ background: item.approval_status === "approved" ? "#e8f8e8" : item.approval_status === "denied" ? "#ffe5e5" : "#f0f0ee", color: item.approval_status === "approved" ? "#22aa66" : item.approval_status === "denied" ? "#E8001C" : "#888", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                          {item.approval_status === "approved" ? "Approved" : item.approval_status === "denied" ? "Denied" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {cpItems.filter(it => it.item_type === "organic").length > 0 && (
                    <tr><td colSpan={4} style={{ background: "#1a1a2e", color: "#D7FA06", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", padding: "7px 14px" }}>ORGANIC VIDEOS</td></tr>
                  )}
                  {cpItems.filter(it => it.item_type === "organic").map(item => (
                    <tr key={item._localId} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "12px 14px", verticalAlign: "top", border: "1px solid #eee" }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: "#aaa", letterSpacing: "0.06em" }}>ORGANIC VIDEO #{item.item_number}</div>
                        {item.reference_link ? <a href={item.reference_link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#1a1a2e", fontWeight: 600, marginTop: 3, display: "block" }}>LINK ↗</a> : <span style={{ color: "#ddd", fontSize: 12, marginTop: 3, display: "block" }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 14px", verticalAlign: "top", fontSize: 12, color: "#444", lineHeight: 1.5, border: "1px solid #eee" }}>{item.whats_needed || "—"}</td>
                      <td style={{ padding: "12px 14px", verticalAlign: "top", fontSize: 13, fontWeight: 700, color: "#333", border: "1px solid #eee" }}>{item.creator_name || "—"}</td>
                      <td style={{ padding: "12px 14px", verticalAlign: "top", border: "1px solid #eee" }}>
                        <span style={{ background: item.approval_status === "approved" ? "#e8f8e8" : item.approval_status === "denied" ? "#ffe5e5" : "#f0f0ee", color: item.approval_status === "approved" ? "#22aa66" : item.approval_status === "denied" ? "#E8001C" : "#888", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                          {item.approval_status === "approved" ? "Approved" : item.approval_status === "denied" ? "Denied" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Shot Plan / References — preview */}
              {cpReferenceImages?.length > 0 && (
                <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1.5px solid #f0f0f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>📌 Shot Plan / References</div>
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

      {/* ── Creator Management Modal ── */}
      {showCreatorMgmt && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => e.target === e.currentTarget && setShowCreatorMgmt(false)}
        >
          <div style={{ background: "white", borderRadius: 16, width: 400, padding: 32, boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 20 }}>Manage Creators</div>
            <div style={{ marginBottom: 20, maxHeight: 200, overflowY: "auto" }}>
              {creators.length === 0 ? (
                <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No creators yet. Add one below.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {creators.map(creator => (
                    <div key={creator.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#f8f8f8", borderRadius: 8, border: "1px solid #e8e8e8" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{creator.name}</span>
                      <button
                        onClick={() => deleteCreator(creator.id)}
                        disabled={creatorLoading}
                        style={{ background: "none", border: "none", color: "#E8001C", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}
                        title="Delete creator"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                autoFocus
                type="text"
                value={newCreatorName}
                onChange={e => setNewCreatorName(e.target.value)}
                placeholder="Creator name..."
                onKeyDown={e => e.key === "Enter" && addCreator()}
                style={{ flex: 1, padding: "9px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 12, outline: "none" }}
                disabled={creatorLoading}
              />
              <button
                onClick={addCreator}
                disabled={creatorLoading || !newCreatorName.trim()}
                style={{ ...primaryBtn, padding: "9px 16px", fontSize: 12 }}
              >
                Add
              </button>
            </div>
            <button
              onClick={() => setShowCreatorMgmt(false)}
              style={{ width: "100%", ...secondaryBtn, padding: "10px 16px" }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── Content Plan Share / Send Modal ── */}
      {cpShareModal && (() => {
        const client = cpShareModal.client;
        const noEmail = !client?.email;
        const noPhone = !client?.phone;
        const methods = [
          { value: "email", label: "Email ✉️", disabled: noEmail, tip: noEmail ? "No email on file" : client.email },
          { value: "sms",   label: "SMS 💬",   disabled: noPhone, tip: noPhone ? "No phone on file" : client.phone },
          { value: "both",  label: "Both 📨",  disabled: noEmail || noPhone, tip: (noEmail || noPhone) ? "Needs email & phone" : `${client.email} & ${client.phone}` },
        ];
        const activeMethod = methods.find(m => m.value === cpShareMethod);
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => e.target === e.currentTarget && setCpShareModal(null)}>
            <div style={{ background: "white", borderRadius: 16, width: 460, padding: 32, boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 2 }}>Send Content Plan</div>
              <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>{cpClientName} — {MONTHS[cpMonth]} {cpYear}</div>

              {/* Public link row */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Public link (no login required)</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                <input readOnly value={cpShareModal.url} style={{ flex: 1, padding: "9px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 12, outline: "none", color: "#555", background: "#f8f8f8" }} />
                <button onClick={() => { navigator.clipboard.writeText(cpShareModal.url).then(() => showToast("Link copied!")); }} style={{ ...primaryBtn, padding: "9px 16px", fontSize: 12 }}>Copy</button>
              </div>

              {/* Delivery method toggle */}
              {!client ? (
                <div style={{ fontSize: 13, color: "#aaa", marginBottom: 20 }}>No client linked — link a client to enable direct send.</div>
              ) : (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Deliver via</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    {methods.map(m => (
                      <button
                        key={m.value}
                        disabled={m.disabled}
                        onClick={() => { if (!m.disabled) { setCpShareMethod(m.value); setCpShareError(""); setCpShareSuccess(""); } }}
                        style={{ flex: 1, padding: "10px 0", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: m.disabled ? "not-allowed" : "pointer", border: "1.5px solid", borderColor: cpShareMethod === m.value ? "#1a1a2e" : "#e0e0e0", background: cpShareMethod === m.value ? "#1a1a2e" : "white", color: cpShareMethod === m.value ? "#D7FA06" : m.disabled ? "#ccc" : "#555", opacity: m.disabled ? 0.5 : 1 }}
                      >{m.label}</button>
                    ))}
                  </div>
                  {activeMethod && !activeMethod.disabled && (
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>To: <span style={{ color: "#1a1a2e", fontWeight: 600 }}>{activeMethod.tip}</span></div>
                  )}
                  {cpShareSuccess && <div style={{ fontSize: 13, color: "#22aa66", fontWeight: 700, marginBottom: 10 }}>{cpShareSuccess}</div>}
                  {cpShareError && <div style={{ fontSize: 12, color: "#E8001C", marginBottom: 10 }}>{cpShareError}</div>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={doSendContentPlan}
                      disabled={cpShareBusy || (activeMethod?.disabled)}
                      style={{ flex: 1, padding: "11px 0", background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: cpShareBusy || activeMethod?.disabled ? "default" : "pointer", opacity: activeMethod?.disabled ? 0.4 : 1 }}
                    >
                      {cpShareBusy ? "Sending..." : `Send via ${cpShareMethod === "both" ? "Email & SMS" : cpShareMethod === "email" ? "Email" : "SMS"}`}
                    </button>
                    <button onClick={() => setCpShareModal(null)} style={{ ...secondaryBtn, padding: "11px 16px" }}>Close</button>
                  </div>
                </>
              )}
              {!client && (
                <div style={{ textAlign: "right", marginTop: 16 }}>
                  <button onClick={() => setCpShareModal(null)} style={{ ...secondaryBtn }}>Close</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
