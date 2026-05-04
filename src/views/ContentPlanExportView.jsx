import { useState, useEffect } from "react";
import { DOC, DISP, MONO, SANS } from "../theme";
import { MONTHS } from "../constants";

export default function ContentPlanExportView({ token }) {
  const [plan, setPlan] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/export-content-plan-data?token=${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setPlan(data.plan);
        setItems(data.items || []);
        setTimeout(() => {
          const waitForFonts = async () => {
            try { if (document.fonts?.ready) await document.fonts.ready; } catch { /* fonts API absent */ }
            window.__CP_EXPORT_READY__ = true;
          };
          waitForFonts();
        }, 300);
      })
      .catch(() => {
        setError(true);
        window.__CP_EXPORT_ERROR__ = true;
      });
  }, [token]);

  if (error) return <div>Export failed.</div>;
  if (!plan) return <div>Loading...</div>;

  const producedItems = items.filter(it => it.item_type === "produced");
  const organicItems = items.filter(it => it.item_type === "organic");

  return (
    <div style={{ fontFamily: SANS, padding: 40, background: DOC.page }}>
      <div className="cp-preview-page" style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, paddingBottom: 22, marginBottom: 20, borderBottom: `1px solid ${DOC.borderStrong}` }}>
          <div style={{ fontFamily: DISP, fontWeight: 400, fontSize: 38, color: DOC.text, lineHeight: 1, textTransform: "uppercase", letterSpacing: 0.5, display: "inline-flex", alignItems: "center", gap: 14 }}>
            <span>{MONTHS[plan.month]} {plan.year}</span>
            <span style={{ fontFamily: SANS, fontStyle: "italic", fontWeight: 400, fontSize: "0.85em", color: DOC.meta, letterSpacing: 0, textTransform: "none", lineHeight: 1 }}>| Content Plan</span>
          </div>
          <div style={{ fontFamily: DISP, fontWeight: 400, fontSize: 38, color: DOC.text, lineHeight: 1, textTransform: "uppercase", letterSpacing: 0.5 }}>{plan.client_name?.toUpperCase()}</div>
        </div>
        <div style={{ fontSize: 13, color: DOC.meta, marginBottom: 24, fontWeight: 700, fontFamily: MONO, letterSpacing: "1px" }}>SHOOT DATE: {plan.shoot_date}</div>
        <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${DOC.border}` }}>
          <thead>
            <tr style={{ background: DOC.cell }}>
              {["TITLE / TYPE", "WHAT'S NEEDED", "REFERENCE", "CREATOR", "APPROVAL"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: DOC.text, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", border: `1px solid ${DOC.borderStrong}`, fontFamily: MONO }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {producedItems.length > 0 && (
              <tr><td colSpan={5} style={{ background: DOC.cell, color: DOC.text, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", padding: "7px 14px", fontFamily: MONO, borderTop: `1px solid ${DOC.borderStrong}`, borderBottom: `1px solid ${DOC.borderStrong}` }}>PRODUCED VIDEOS</td></tr>
            )}
            {producedItems.map(item => (
              <tr key={item.id} style={{ border: `1px solid ${DOC.border}` }}>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: `1px solid ${DOC.border}`, fontSize: 12, color: DOC.text }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: DOC.meta, letterSpacing: "0.06em", fontFamily: MONO }}>PRODUCED VIDEO #{item.item_number}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginTop: 3 }}>{item.title}</div>
                  {item.reference_link && <div style={{ fontSize: 10, color: DOC.metaSoft, marginTop: 4 }}>INSPO: {item.reference_link}</div>}
                </td>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: `1px solid ${DOC.border}`, fontSize: 12, lineHeight: 1.5, color: DOC.text }}>{item.whats_needed}</td>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: `1px solid ${DOC.border}`, fontSize: 12, color: DOC.text }}>{item.reference_link ? "LINK" : ""}</td>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: `1px solid ${DOC.border}`, fontSize: 12, fontWeight: 700, color: DOC.text }}>{item.creator_name}</td>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: `1px solid ${DOC.border}`, fontSize: 12, fontWeight: 700, color: DOC.text }}>{item.approval_status === "approved" ? "Yes" : item.approval_status === "denied" ? "No" : "TBD"}</td>
              </tr>
            ))}
            {organicItems.length > 0 && (
              <tr><td colSpan={5} style={{ background: DOC.cell, color: DOC.text, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", padding: "7px 14px", fontFamily: MONO, borderTop: `1px solid ${DOC.borderStrong}`, borderBottom: `1px solid ${DOC.borderStrong}` }}>ORGANIC VIDEOS</td></tr>
            )}
            {organicItems.map(item => (
              <tr key={item.id} style={{ border: `1px solid ${DOC.border}` }}>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: `1px solid ${DOC.border}`, fontSize: 12, color: DOC.text }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: DOC.meta, letterSpacing: "0.06em", fontFamily: MONO }}>ORGANIC VIDEO #{item.item_number}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginTop: 3 }}>{item.title}</div>
                  {item.reference_link && <div style={{ fontSize: 10, color: DOC.metaSoft, marginTop: 4 }}>INSPO: {item.reference_link}</div>}
                </td>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: `1px solid ${DOC.border}`, fontSize: 12, lineHeight: 1.5, color: DOC.text }}>{item.whats_needed}</td>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: `1px solid ${DOC.border}`, fontSize: 12, color: DOC.text }}>{item.reference_link ? "LINK" : ""}</td>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: `1px solid ${DOC.border}`, fontSize: 12, fontWeight: 700, color: DOC.text }}>{item.creator_name}</td>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: `1px solid ${DOC.border}`, fontSize: 12, fontWeight: 700, color: DOC.text }}>{item.approval_status === "approved" ? "Yes" : item.approval_status === "denied" ? "No" : "TBD"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
