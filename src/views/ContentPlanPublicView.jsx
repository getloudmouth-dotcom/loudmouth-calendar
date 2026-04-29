import { useState, useEffect } from "react";
import { MONTHS } from "../constants";

export default function ContentPlanPublicView({ token }) {
  const [plan, setPlan] = useState(null);
  const [items, setItems] = useState([]);
  const [shareConfig, setShareConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [itemStates, setItemStates] = useState({});
  const [savingItem, setSavingItem] = useState(null);
  const [noteText, setNoteText] = useState({});
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    fetch(`/api/get-content-plan-public?token=${token}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        setPlan(data.plan);
        setItems(data.items || []);
        setShareConfig(data.share);
        const states = {};
        const notes = {};
        (data.items || []).forEach(it => {
          states[it.id] = it.approval_status;
          notes[it.id] = it.client_notes || "";
        });
        setItemStates(states);
        setNoteText(notes);
        setLoading(false);
      })
      .catch(code => {
        setError(code === 404 ? "This link is invalid or has expired." : "Failed to load content plan.");
        setLoading(false);
      });
  }, [token]);

  async function updateItem(itemId, field, value) {
    const prev = field === "approval_status" ? itemStates[itemId] : noteText[itemId];
    if (field === "approval_status") setItemStates(s => ({ ...s, [itemId]: value }));
    setSavingItem(itemId);
    try {
      const res = await fetch("/api/update-content-plan-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, itemId, field, value }),
      });
      if (!res.ok) throw new Error("Failed");
      if (field === "approval_status") showToast("Status updated!");
    } catch {
      if (field === "approval_status") setItemStates(s => ({ ...s, [itemId]: prev }));
      showToast("Failed to save — please try again.", "error");
    } finally {
      setSavingItem(null);
    }
  }

  const APPROVAL_STYLES = {
    pending:  { bg: "#f0f0ee", color: "#888",    label: "Pending" },
    approved: { bg: "#e8f8e8", color: "#22aa66",  label: "Approved" },
    denied:   { bg: "#ffe5e5", color: "#E8001C",  label: "Denied" },
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#1a1a2e", color: "#D7FA06", fontSize: 15, fontWeight: 700, letterSpacing: "0.06em" }}>
      LOADING...
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#1a1a2e", color: "white", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{error}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Please contact your team for a new link.</div>
    </div>
  );

  const producedItems = items.filter(it => it.item_type === "produced");
  const organicItems = items.filter(it => it.item_type === "organic");

  return (
    <div style={{ minHeight: "100vh", background: "#f4f4f0", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 24, zIndex: 99999, background: toast.type === "error" ? "#E8001C" : "#1a1a2e", color: toast.type === "error" ? "white" : "#D7FA06", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}
      <div style={{ background: "#1a1a2e", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
          <div style={{ color: "#D7FA06", fontWeight: 900, fontSize: 16, letterSpacing: "0.08em" }}>CONTENT PLAN</div>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, letterSpacing: "0.06em" }}>by Loudmouth</div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600 }}>
          {plan?.client_name} — {MONTHS[plan?.month]} {plan?.year}
        </div>
      </div>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 60px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#1a1a2e", letterSpacing: "-0.01em" }}>
            {plan?.client_name?.toUpperCase()} CONTENT PLAN
          </div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 4, fontWeight: 600 }}>
            SHOOT DATE: {plan?.shoot_date === "PENDING" ? "PENDING" : plan?.shoot_date}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <thead>
              <tr style={{ background: "#1a1a2e" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#D7FA06", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", width: "22%" }}>PRODUCED VIDEO</th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#D7FA06", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", width: "30%" }}>WHAT'S NEEDED</th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#D7FA06", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", width: "12%" }}>CREATOR</th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "#D7FA06", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", width: "10%" }}>APPROVAL</th>
                {shareConfig?.allow_client_notes && (
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#D7FA06", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", width: "12%" }}>YOUR NOTES</th>
                )}
              </tr>
            </thead>
            <tbody>
              {producedItems.length > 0 && (
                <tr><td colSpan={shareConfig?.allow_client_notes ? 5 : 4} style={{ background: "#1a1a2e", color: "#D7FA06", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", padding: "8px 16px" }}>PRODUCED VIDEOS</td></tr>
              )}
              {producedItems.map((item, idx) => {
                const status = itemStates[item.id] || "pending";
                const st = APPROVAL_STYLES[status];
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f0f0f0", background: idx % 2 === 0 ? "white" : "#fafaf8" }}>
                    <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#767676", letterSpacing: "0.06em", marginBottom: 4 }}>PRODUCED VIDEO #{item.item_number}</div>
                      {item.reference_link ? (
                        <a href={item.reference_link} target="_blank" rel="noreferrer" style={{ color: "#1a1a2e", fontSize: 12, fontWeight: 600, textDecoration: "underline", wordBreak: "break-all" }}>LINK ↗</a>
                      ) : <span style={{ color: "#ddd", fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 16px", verticalAlign: "top", fontSize: 13, color: "#444", lineHeight: 1.6 }}>{item.whats_needed || "—"}</td>
                    <td style={{ padding: "14px 16px", verticalAlign: "top", fontSize: 13, fontWeight: 600, color: "#333" }}>{item.creator_name || "—"}</td>
                    <td style={{ padding: "14px 16px", verticalAlign: "top", textAlign: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                        <div style={{ background: st.bg, color: st.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{st.label}</div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {["approved", "denied", "pending"].map(s => (
                            <button key={s} onClick={() => updateItem(item.id, "approval_status", s)} disabled={savingItem === item.id || status === s}
                              style={{ fontSize: 9, fontWeight: 700, padding: "3px 7px", borderRadius: 12, border: "1.5px solid", cursor: status === s ? "default" : "pointer", opacity: status === s ? 0.4 : 1, background: s === "approved" ? "#e8f8e8" : s === "denied" ? "#ffe5e5" : "#f0f0ee", color: s === "approved" ? "#22aa66" : s === "denied" ? "#E8001C" : "#888", borderColor: s === "approved" ? "#22aa66" : s === "denied" ? "#E8001C" : "#ccc" }}>
                              {s === "approved" ? "✓" : s === "denied" ? "✗" : "?"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                    {shareConfig?.allow_client_notes && (
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <textarea value={noteText[item.id] || ""} onChange={e => setNoteText(n => ({ ...n, [item.id]: e.target.value }))} onBlur={() => updateItem(item.id, "client_notes", noteText[item.id] || "")} placeholder="Add notes..." rows={3} style={{ width: "100%", fontSize: 12, padding: "6px 8px", border: "1.5px solid #e0e0e0", borderRadius: 6, outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
                      </td>
                    )}
                  </tr>
                );
              })}
              {organicItems.length > 0 && (
                <tr><td colSpan={shareConfig?.allow_client_notes ? 5 : 4} style={{ background: "#1a1a2e", color: "#D7FA06", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", padding: "8px 16px" }}>ORGANIC VIDEOS</td></tr>
              )}
              {organicItems.map((item, idx) => {
                const status = itemStates[item.id] || "pending";
                const st = APPROVAL_STYLES[status];
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f0f0f0", background: idx % 2 === 0 ? "white" : "#fafaf8" }}>
                    <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#767676", letterSpacing: "0.06em", marginBottom: 4 }}>ORGANIC VIDEO #{item.item_number}</div>
                      {item.reference_link ? (
                        <a href={item.reference_link} target="_blank" rel="noreferrer" style={{ color: "#1a1a2e", fontSize: 12, fontWeight: 600, textDecoration: "underline", wordBreak: "break-all" }}>LINK ↗</a>
                      ) : <span style={{ color: "#ddd", fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 16px", verticalAlign: "top", fontSize: 13, color: "#444", lineHeight: 1.6 }}>{item.whats_needed || "—"}</td>
                    <td style={{ padding: "14px 16px", verticalAlign: "top", fontSize: 13, fontWeight: 600, color: "#333" }}>{item.creator_name || "—"}</td>
                    <td style={{ padding: "14px 16px", verticalAlign: "top", textAlign: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                        <div style={{ background: st.bg, color: st.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{st.label}</div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {["approved", "denied", "pending"].map(s => (
                            <button key={s} onClick={() => updateItem(item.id, "approval_status", s)} disabled={savingItem === item.id || status === s}
                              style={{ fontSize: 9, fontWeight: 700, padding: "3px 7px", borderRadius: 12, border: "1.5px solid", cursor: status === s ? "default" : "pointer", opacity: status === s ? 0.4 : 1, background: s === "approved" ? "#e8f8e8" : s === "denied" ? "#ffe5e5" : "#f0f0ee", color: s === "approved" ? "#22aa66" : s === "denied" ? "#E8001C" : "#888", borderColor: s === "approved" ? "#22aa66" : s === "denied" ? "#E8001C" : "#ccc" }}>
                              {s === "approved" ? "✓" : s === "denied" ? "✗" : "?"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                    {shareConfig?.allow_client_notes && (
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <textarea value={noteText[item.id] || ""} onChange={e => setNoteText(n => ({ ...n, [item.id]: e.target.value }))} onBlur={() => updateItem(item.id, "client_notes", noteText[item.id] || "")} placeholder="Add notes..." rows={3} style={{ width: "100%", fontSize: 12, padding: "6px 8px", border: "1.5px solid #e0e0e0", borderRadius: 6, outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 32, padding: "16px 20px", background: "#f8f8f6", borderRadius: 10, fontSize: 12, color: "#767676", textAlign: "center" }}>
          Review each item and use the buttons to approve or deny. Your notes are saved automatically.
        </div>
      </div>
    </div>
  );
}
