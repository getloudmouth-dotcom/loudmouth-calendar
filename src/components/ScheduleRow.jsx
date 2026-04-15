import { useState } from "react";
import { supabase } from "../supabase";

export default function ScheduleRow({ row, onRemove, onToggleNotify, currentUserId, optedInUsers = [] }) {
  const [removing, setRemoving] = useState(false);
  const [showOptedIn, setShowOptedIn] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // null | "sending" | "sent" | "error"

  const dateStr = new Date(row.post_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const types = (row.content_types || []).join(", ") || "—";
  const links = (row.drive_links || []).filter(Boolean);

  const myEntry = optedInUsers.find(u => u.userId === currentUserId);
  const iAmNotified = myEntry ? myEntry.notify !== false : true;
  const activeOptIns = optedInUsers.filter(u => u.notify !== false);
  const hasCollaborators = optedInUsers.length > 1;

  async function handleRemove() {
    setRemoving(true);
    await onRemove(row.id);
  }

  async function handleTestEmail() {
    setTestStatus("sending");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/send-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ rowId: row.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed");
      }
      setTestStatus("sent");
      setTimeout(() => setTestStatus(null), 3000);
    } catch {
      setTestStatus("error");
      setTimeout(() => setTestStatus(null), 3000);
    }
  }

  function displayName(u) {
    return u.name || u.email || "Unknown";
  }

  return (
    <div style={{ background: "white", borderRadius: 10, border: "1.5px solid #e8e8e8", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: "#1a1a2e" }}>{row.client_name}</span>
            {row.email_sent_at && <span style={{ fontSize: 10, background: "#e8f8e8", color: "#3a8a3a", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>Sent</span>}
            {!iAmNotified && <span style={{ fontSize: 10, background: "#f5f5f5", color: "#aaa", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>Muted</span>}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{dateStr} · {types}</div>
          {links.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 6 }}>
              {links.map((l, i) => (
                <a key={i} href={l} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#555", textDecoration: "none", wordBreak: "break-all" }} onMouseEnter={e => e.currentTarget.style.color = "#1a1a2e"} onMouseLeave={e => e.currentTarget.style.color = "#555"}>
                  {l.length > 60 ? l.slice(0, 60) + "…" : l}
                </a>
              ))}
            </div>
          )}
          {hasCollaborators && (
            <button
              onClick={() => setShowOptedIn(v => !v)}
              style={{ background: "none", border: "none", padding: 0, fontSize: 11, color: "#888", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            >
              <span>👤 {activeOptIns.length} opted in</span>
              <span style={{ fontSize: 9, color: "#bbb" }}>{showOptedIn ? "▲" : "▼"}</span>
            </button>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          {iAmNotified ? (
            <button
              onClick={() => onToggleNotify(row.id, false)}
              style={{ background: "none", border: "1.5px solid #eee", color: "#aaa", borderRadius: 7, padding: "5px 10px", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Unsubscribe
            </button>
          ) : (
            <button
              onClick={() => onToggleNotify(row.id, true)}
              style={{ background: "#f5fbda", border: "1.5px solid #D7FA06", color: "#5a7a00", borderRadius: 7, padding: "5px 10px", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", fontWeight: 700 }}
            >
              Re-subscribe
            </button>
          )}
          <button onClick={handleRemove} disabled={removing} style={{ background: "none", border: "1.5px solid #eee", color: "#ccc", borderRadius: 7, padding: "5px 10px", fontSize: 12, cursor: removing ? "default" : "pointer" }}>
            {removing ? "…" : "Remove"}
          </button>
          <button
            onClick={handleTestEmail}
            disabled={testStatus === "sending"}
            title="Send a test reminder email right now"
            style={{
              background: testStatus === "sent" ? "#e8f8e8" : testStatus === "error" ? "#fde8e8" : "none",
              border: `1.5px solid ${testStatus === "sent" ? "#b0e0b0" : testStatus === "error" ? "#f0b0b0" : "#eee"}`,
              color: testStatus === "sent" ? "#3a8a3a" : testStatus === "error" ? "#c03030" : "#aaa",
              borderRadius: 7,
              padding: "5px 10px",
              fontSize: 11,
              cursor: testStatus === "sending" ? "default" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {testStatus === "sending" ? "…" : testStatus === "sent" ? "Sent!" : testStatus === "error" ? "Error" : "Test"}
          </button>
        </div>
      </div>

      {showOptedIn && hasCollaborators && (
        <div style={{ borderTop: "1px solid #f0f0f0", padding: "10px 16px", background: "#fafafa" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Who's opted in</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {optedInUsers.map(u => (
              <div key={u.userId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#e8e8e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#888", flexShrink: 0 }}>
                  {displayName(u).charAt(0).toUpperCase() || "?"}
                </div>
                <span style={{ fontSize: 12, color: u.notify !== false ? "#1a1a2e" : "#bbb", flex: 1 }}>
                  {displayName(u)}{u.userId === currentUserId ? " (you)" : ""}
                </span>
                {u.notify !== false
                  ? <span style={{ fontSize: 10, background: "#e8f8e8", color: "#3a8a3a", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>✓ on</span>
                  : <span style={{ fontSize: 10, background: "#f5f5f5", color: "#bbb", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>off</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
