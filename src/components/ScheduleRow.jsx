import { useState } from "react";

export default function ScheduleRow({ row, onRemove }) {
  const [removing, setRemoving] = useState(false);
  const dateStr = new Date(row.post_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const types = (row.content_types || []).join(", ") || "—";
  const links = (row.drive_links || []).filter(Boolean);

  async function handleRemove() {
    setRemoving(true);
    await onRemove(row.id);
  }

  return (
    <div style={{ background: "white", borderRadius: 10, padding: "14px 16px", border: "1.5px solid #e8e8e8", display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: "#1a1a2e" }}>{row.client_name}</span>
          {row.email_sent_at && <span style={{ fontSize: 10, background: "#e8f8e8", color: "#3a8a3a", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>Sent</span>}
        </div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{dateStr} · {types}</div>
        {links.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {links.map((l, i) => (
              <a key={i} href={l} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#555", textDecoration: "none", wordBreak: "break-all" }} onMouseEnter={e => e.currentTarget.style.color = "#1a1a2e"} onMouseLeave={e => e.currentTarget.style.color = "#555"}>
                {l.length > 60 ? l.slice(0, 60) + "…" : l}
              </a>
            ))}
          </div>
        )}
      </div>
      <button onClick={handleRemove} disabled={removing} style={{ flexShrink: 0, background: "none", border: "1.5px solid #eee", color: "#ccc", borderRadius: 7, padding: "5px 10px", fontSize: 12, cursor: removing ? "default" : "pointer" }}>
        {removing ? "…" : "Remove"}
      </button>
    </div>
  );
}
