import { useState, useEffect } from "react";

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
            try { if (document.fonts?.ready) await document.fonts.ready; } catch {}
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
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", padding: 40, background: "white" }}>
      <div className="cp-preview-page" style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "0.04em", color: "#1a1a2e" }}>{plan.client_name?.toUpperCase()} CONTENT PLAN</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 4, fontWeight: 600 }}>SHOOT DATE: {plan.shoot_date}</div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
          <thead>
            <tr style={{ background: "#1a1a2e" }}>
              {["TITLE / TYPE", "WHAT'S NEEDED", "REFERENCE", "CREATOR", "APPROVAL"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#D7FA06", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", border: "1px solid #333" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {producedItems.length > 0 && (
              <tr><td colSpan={5} style={{ background: "#1a1a2e", color: "#D7FA06", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", padding: "7px 14px" }}>PRODUCED VIDEOS</td></tr>
            )}
            {producedItems.map(item => (
              <tr key={item.id} style={{ border: "1px solid #ddd" }}>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: "1px solid #ddd", fontSize: 12 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#767676", letterSpacing: "0.06em" }}>PRODUCED VIDEO #{item.item_number}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginTop: 3 }}>{item.title}</div>
                  {item.reference_link && <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>INSPO: {item.reference_link}</div>}
                </td>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: "1px solid #ddd", fontSize: 12, lineHeight: 1.5 }}>{item.whats_needed}</td>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: "1px solid #ddd", fontSize: 12 }}>{item.reference_link ? "LINK" : ""}</td>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: "1px solid #ddd", fontSize: 12, fontWeight: 700 }}>{item.creator_name}</td>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: "1px solid #ddd", fontSize: 12, fontWeight: 700 }}>{item.approval_status === "approved" ? "Yes" : item.approval_status === "denied" ? "No" : "TBD"}</td>
              </tr>
            ))}
            {organicItems.length > 0 && (
              <tr><td colSpan={5} style={{ background: "#1a1a2e", color: "#D7FA06", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", padding: "7px 14px" }}>ORGANIC VIDEOS</td></tr>
            )}
            {organicItems.map(item => (
              <tr key={item.id} style={{ border: "1px solid #ddd" }}>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: "1px solid #ddd", fontSize: 12 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#767676", letterSpacing: "0.06em" }}>ORGANIC VIDEO #{item.item_number}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginTop: 3 }}>{item.title}</div>
                  {item.reference_link && <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>INSPO: {item.reference_link}</div>}
                </td>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: "1px solid #ddd", fontSize: 12, lineHeight: 1.5 }}>{item.whats_needed}</td>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: "1px solid #ddd", fontSize: 12 }}>{item.reference_link ? "LINK" : ""}</td>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: "1px solid #ddd", fontSize: 12, fontWeight: 700 }}>{item.creator_name}</td>
                <td style={{ padding: "12px 14px", verticalAlign: "top", border: "1px solid #ddd", fontSize: 12, fontWeight: 700 }}>{item.approval_status === "approved" ? "Yes" : item.approval_status === "denied" ? "No" : "TBD"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
