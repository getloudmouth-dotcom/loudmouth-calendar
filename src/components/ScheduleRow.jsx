import { useState } from "react";
import { supabase } from "../supabase";

const SANS = "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif";
const MONO = "'Space Mono', 'Courier New', monospace";
const DISP = "'Anton', Impact, Helvetica, sans-serif";

const C = {
  canvas:  "#131313",
  surface: "#1e1e1e",
  surface2:"#2a2a2a",
  accent:  "#CCFF00",
  text:    "#ffffff",
  meta:    "#949494",
  border:  "rgba(255,255,255,0.14)",
};

export default function ScheduleRow({ row, onRemove, onToggleNotify, currentUserId, optedInUsers = [], allCalendars = [], openCalendar }) {
  const [removing, setRemoving] = useState(false);
  const [showOptedIn, setShowOptedIn] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // null | "sending" | "sent" | "error"

  const types = (row.content_types || []).join(", ") || "—";
  const calendar = allCalendars.find(c => c.id === row.calendar_id);

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
    <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden", transition: "border-color 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
      <div style={{ padding: "14px 18px", height: 80, boxSizing: "border-box", overflow: "hidden", display: "flex", alignItems: "center", gap: 12 }}>
        {/* Date badge */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 36, gap: 1 }}>
          <div style={{ fontFamily: DISP, fontSize: 24, color: C.accent, lineHeight: 1 }}>
            {new Date(row.post_date + "T12:00:00").getDate()}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 8, color: C.meta, textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: 1 }}>
            {new Date(row.post_date + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}
          </div>
        </div>
        <div style={{ width: 1, alignSelf: "stretch", background: C.border, flexShrink: 0, margin: "6px 0" }} />

        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "nowrap", overflow: "hidden" }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: C.text, fontFamily: SANS, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1 }}>{row.client_name}</span>
            {row.email_sent_at && (
              <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", background: "rgba(127,217,158,0.15)", color: "#7fd99e", borderRadius: 20, padding: "3px 8px", flexShrink: 0, lineHeight: 1 }}>Sent</span>
            )}
            {!iAmNotified && (
              <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", background: "rgba(255,255,255,0.05)", color: C.meta, borderRadius: 20, padding: "1px 5px", flexShrink: 0, lineHeight: 1 }}>Muted</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.meta, textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{types}</span>
            {calendar && openCalendar && (
              <button
                onClick={() => openCalendar(calendar)}
                title="Open this calendar"
                style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.meta, borderRadius: 20, padding: "2px 8px", fontFamily: MONO, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: 1, cursor: "pointer", flexShrink: 0, transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.meta; }}
              >
                Open →
              </button>
            )}
          </div>
          {hasCollaborators && (
            <button
              onClick={() => setShowOptedIn(v => !v)}
              style={{ background: "none", border: "none", padding: 0, marginTop: 4, fontFamily: MONO, fontSize: 9, color: C.meta, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: 1 }}
            >
              <span>{activeOptIns.length} opted in</span>
              <span style={{ fontSize: 8, lineHeight: 1 }}>{showOptedIn ? "▲" : "▼"}</span>
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
          {iAmNotified ? (
            <button
              onClick={() => onToggleNotify(row.id, false)}
              title="Unsubscribe from email reminders"
              style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.meta, borderRadius: 20, padding: "4px 10px", fontFamily: MONO, fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; e.currentTarget.style.color = C.text; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.meta; }}
            >
              Mute
            </button>
          ) : (
            <button
              onClick={() => onToggleNotify(row.id, true)}
              title="Re-subscribe to email reminders"
              style={{ background: "rgba(204,255,0,0.1)", border: `1px solid ${C.accent}`, color: C.accent, borderRadius: 20, padding: "4px 10px", fontFamily: MONO, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Unmute
            </button>
          )}
          <button
            onClick={handleTestEmail}
            disabled={testStatus === "sending"}
            title="Send a test reminder email right now"
            style={{
              background: testStatus === "sent" ? "rgba(127,217,158,0.12)" : testStatus === "error" ? "rgba(255,68,68,0.1)" : "transparent",
              border: `1px solid ${testStatus === "sent" ? "#7fd99e" : testStatus === "error" ? "#ff4444" : C.border}`,
              color: testStatus === "sent" ? "#7fd99e" : testStatus === "error" ? "#ff4444" : C.meta,
              borderRadius: 20,
              padding: "4px 10px",
              fontFamily: MONO,
              fontSize: 9,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "1px",
              cursor: testStatus === "sending" ? "default" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {testStatus === "sending" ? "…" : testStatus === "sent" ? "Sent!" : testStatus === "error" ? "Err" : "Test"}
          </button>
          <button
            onClick={handleRemove}
            disabled={removing}
            title="Remove from schedule"
            style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.meta, borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, lineHeight: 1, cursor: removing ? "default" : "pointer", flexShrink: 0, transition: "all 0.15s" }}
            onMouseEnter={e => { if (!removing) { e.currentTarget.style.borderColor = "#ff4444"; e.currentTarget.style.color = "#ff4444"; } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.meta; }}
          >
            {removing ? "…" : "×"}
          </button>
        </div>
      </div>

      {showOptedIn && hasCollaborators && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 18px", background: C.canvas }}>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: C.meta, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10, lineHeight: 1 }}>Who's opted in</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {optedInUsers.map(u => (
              <div key={u.userId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#000", flexShrink: 0, fontFamily: MONO, lineHeight: 1 }}>
                  {displayName(u).charAt(0).toUpperCase() || "?"}
                </div>
                <span style={{ fontFamily: SANS, fontSize: 12, color: u.notify !== false ? C.text : C.meta, flex: 1, lineHeight: 1 }}>
                  {displayName(u)}{u.userId === currentUserId ? " (you)" : ""}
                </span>
                {u.notify !== false
                  ? <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", background: "rgba(127,217,158,0.15)", color: "#7fd99e", borderRadius: 20, padding: "1px 6px", lineHeight: 1 }}>On</span>
                  : <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", background: "rgba(255,255,255,0.05)", color: C.meta, borderRadius: 20, padding: "1px 6px", lineHeight: 1 }}>Off</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
