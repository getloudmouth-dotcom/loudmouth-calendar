import { useState } from "react";
import { SANS, MONO, DISP, C, DISPLAY_TITLE, DISPLAY_SUBTITLE } from "../theme";
import { MONTHS } from "../constants";
import { useApp } from "../AppContext";

export default function ClientPortal({
  client,
  allCalendars,
  onBack,
  onSelectCalendar,
  onNewMonth,
  deleteCalendar,
}) {
  const { user, can } = useApp();
  const [hoveredPill, setHoveredPill] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  const clientCals = allCalendars
    .filter(c => c.client_id === client.id || c.client_name?.toLowerCase() === client.name?.toLowerCase())
    .sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.canvas, fontFamily: SANS }}>

      {/* Header */}
      <div style={{ padding: "18px 48px 0", borderBottom: `1px solid ${C.border}`, background: C.canvas }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: C.meta, fontFamily: MONO, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", cursor: "pointer", padding: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}
        >
          ← Clients
        </button>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 20, paddingBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: DISP, fontSize: 22, color: "#000", lineHeight: 1 }}>
              {(client.name || "?")[0].toUpperCase()}
            </span>
          </div>
          <div>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 22, color: C.text, lineHeight: 1, marginBottom: 4 }}>{client.name}</div>
            {(client.company || client.email) && (
              <div style={{ fontFamily: SANS, fontSize: 12, color: C.meta }}>
                {[client.company, client.email].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Month timeline */}
      <div style={{ flex: 1, overflowY: "auto", padding: "40px 48px" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={DISPLAY_TITLE}>Select a Month</div>
          <div style={DISPLAY_SUBTITLE}>Choose an existing month or create a new one.</div>
        </div>

        {clientCals.length === 0 && (
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.meta, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 32 }}>
            No months yet — hit "+ New Month" to get started.
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {clientCals.map((cal, i) => {
            const isCurrent = i === clientCals.length - 1;
            const canDelete = cal.user_id === user?.id || can("admin_portal");
            return (
              <div
                key={cal.id}
                style={{ position: "relative" }}
                onMouseEnter={() => setHoveredPill(cal.id)}
                onMouseLeave={() => setHoveredPill(null)}
              >
                <button
                  onClick={() => onSelectCalendar(cal)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 24,
                    border: `1px solid ${isCurrent ? C.accent : C.border}`,
                    background: isCurrent ? "rgba(204,255,0,0.08)" : "transparent",
                    color: isCurrent ? C.accent : C.text,
                    fontFamily: MONO,
                    fontSize: 11,
                    fontWeight: isCurrent ? 700 : 500,
                    textTransform: "uppercase",
                    letterSpacing: "1.2px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = isCurrent ? C.accent : C.border;
                    e.currentTarget.style.color = isCurrent ? C.accent : C.text;
                  }}
                >
                  {MONTHS[cal.month].slice(0, 3)} {cal.year}
                  {isCurrent && <span style={{ fontSize: 8, background: C.accent, color: "#000", borderRadius: 20, padding: "2px 6px", fontWeight: 800 }}>CURRENT</span>}
                </button>
                {canDelete && (
                  <button
                    onClick={e => { e.stopPropagation(); deleteCalendar(cal); }}
                    style={{
                      position: "absolute", top: -6, right: -6,
                      width: 18, height: 18, borderRadius: "50%",
                      background: C.error, border: "none", color: "#fff",
                      fontSize: 11, lineHeight: 1, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: hoveredPill === cal.id ? 1 : 0,
                      pointerEvents: hoveredPill === cal.id ? "auto" : "none",
                      transition: "opacity 0.15s",
                    }}
                    title={`Delete ${MONTHS[cal.month]} ${cal.year}`}
                  >×</button>
                )}
              </div>
            );
          })}

          {/* New Month pill */}
          <button
            onClick={() => onNewMonth(client, clientCals[clientCals.length - 1] || null)}
            style={{
              padding: "10px 20px",
              borderRadius: 24,
              border: `1px dashed rgba(255,255,255,0.2)`,
              background: "transparent",
              color: C.meta,
              fontFamily: MONO,
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "1.2px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = C.meta; }}
          >
            + New Month
          </button>
        </div>

        {/* Recent updates */}
        {clientCals.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.8px", color: C.meta, marginBottom: 16 }}>
              Recent Activity
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...clientCals].reverse().slice(0, 5).map(cal => {
                const canDelete = cal.user_id === user?.id || can("admin_portal");
                return (
                  <div
                    key={cal.id}
                    onClick={() => onSelectCalendar(cal)}
                    style={{
                      background: C.surface, border: `1px solid ${hoveredRow === cal.id ? C.accent : C.border}`, borderRadius: 12,
                      padding: "14px 18px", display: "flex", alignItems: "center", gap: 16,
                      cursor: "pointer", transition: "border-color 0.15s",
                    }}
                    onMouseEnter={() => setHoveredRow(cal.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: C.accent, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 8, textTransform: "uppercase", color: "#000", lineHeight: 1.2 }}>{MONTHS[cal.month].slice(0, 3)}</span>
                      <span style={{ fontFamily: MONO, fontSize: 7, color: "#000", lineHeight: 1.2 }}>{cal.year}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.text }}>
                        {MONTHS[cal.month]} {cal.year}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 9, color: C.meta, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>
                        {cal.updated_at ? `Saved ${new Date(cal.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "—"}
                        {cal.last_updated_by ? ` · ${cal.last_updated_by}` : ""}
                      </div>
                    </div>
                    {canDelete ? (
                      <button
                        onClick={e => { e.stopPropagation(); deleteCalendar(cal); }}
                        style={{
                          background: "none", border: "none", color: C.meta, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "2px 6px",
                          opacity: hoveredRow === cal.id ? 1 : 0,
                          pointerEvents: hoveredRow === cal.id ? "auto" : "none",
                          transition: "opacity 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = C.error; }}
                        onMouseLeave={e => { e.currentTarget.style.color = C.meta; }}
                        title={`Delete ${MONTHS[cal.month]} ${cal.year}`}
                      >×</button>
                    ) : (
                      <span style={{ fontFamily: MONO, fontSize: 9, color: C.meta }}>→</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
