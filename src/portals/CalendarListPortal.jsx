import { MONTHS } from "../constants";
import { useApp } from "../AppContext";
import CollabAvatars from "../components/CollabAvatars";
import { SANS, MONO, C, btn } from "../theme";

export default function CalendarListPortal({
  allCalendars, calCollaborators,
  schedulingCalId, openCalendar, newCalendar, deleteCalendar, addToSchedule,
  setShareModal, setShareEmail, setShareError,
  setActivePortal,
  scheduledPosts,
}) {
  const { user } = useApp();

  return (
    <div style={{ background: C.canvas, minHeight: "100vh", fontFamily: SANS }}>
      {/* Header */}
      <div style={{ padding: "20px 48px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => setActivePortal(null)} style={btn({ padding: "6px 12px" })}>← Back</button>
        <div style={{ width: 1, height: 18, background: C.border }} />
        <div style={{ fontWeight: 700, fontSize: 16, color: C.text, fontFamily: SANS, lineHeight: 1 }}>Calendar Creator</div>
        <div style={{ flex: 1 }} />
      </div>

      <div style={{ padding: "36px 48px" }}>
        {allCalendars.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>📅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8, lineHeight: 1, fontFamily: SANS }}>No calendars yet</div>
            <div style={{ fontSize: 13, color: C.meta, lineHeight: 1, fontFamily: SANS }}>Hit "+ New Calendar" to get started</div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {allCalendars.map(cal => (
            <div
              key={cal.id}
              style={{ background: C.surface, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, cursor: "pointer", transition: "border-color 0.15s" }}
              onClick={e => { if (e.target.closest("button")) return; openCalendar(cal); }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 15, flex: 1, color: C.text, fontFamily: SANS, lineHeight: 1 }}>{cal.client_name}</div>
                {cal.user_id !== user?.id && (
                  <span style={{ background: "rgba(68,102,204,0.15)", color: "#7799ff", fontSize: 9, fontWeight: 700, borderRadius: 20, padding: "2px 7px", letterSpacing: "0.5px", fontFamily: MONO, textTransform: "uppercase", lineHeight: 1 }}>Shared</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: C.meta, marginBottom: 10, fontFamily: MONO, lineHeight: 1 }}>{MONTHS[cal.month]} {cal.year} · {(cal.selected_days || []).length} day{(cal.selected_days || []).length !== 1 ? "s" : ""}</div>
              <div style={{ fontSize: 10, color: C.meta, marginBottom: 12, fontFamily: MONO, lineHeight: 1, opacity: 0.7 }}>
                Saved {new Date(cal.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
              <CollabAvatars collaborators={calCollaborators[cal.id]} />
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <button
                  onClick={e => { e.stopPropagation(); openCalendar(cal); }}
                  style={btn({ flex: 1, padding: "7px 10px", background: C.accent, color: "#000", border: "none", letterSpacing: "1.5px" })}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >Open</button>

                {cal.user_id === user?.id && (
                  <button
                    onClick={e => { e.stopPropagation(); setShareModal({ cal }); setShareEmail(""); setShareError(""); }}
                    style={btn({ padding: "7px 12px" })}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; e.currentTarget.style.color = C.text; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.meta; }}
                  >Share</button>
                )}

                {(() => {
                  const isScheduled = (scheduledPosts || []).some(r => r.calendar_id === cal.id && r.user_id === user?.id);
                  const isBusy = schedulingCalId === cal.id;
                  return (
                    <button
                      onClick={e => { e.stopPropagation(); addToSchedule(cal); }}
                      disabled={isBusy}
                      title={isScheduled ? "Remove from reminder schedule" : "Add to reminder schedule"}
                      style={btn(isScheduled
                        ? { padding: "7px 10px", background: "rgba(204,255,0,0.1)", borderColor: C.accent, color: C.accent }
                        : { padding: "7px 10px" }
                      )}
                      onMouseEnter={e => { if (!isBusy && !isScheduled) { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; } }}
                      onMouseLeave={e => { if (!isScheduled) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.meta; } }}
                    >
                      {isBusy ? "..." : isScheduled ? "✓ Sched" : "+ Sched"}
                    </button>
                  );
                })()}

                {cal.user_id === user?.id && (
                  <button
                    onClick={e => { e.stopPropagation(); deleteCalendar(cal); }}
                    style={btn({ padding: "7px 10px" })}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#ff4444"; e.currentTarget.style.color = "#ff4444"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.meta; }}
                  >🗑</button>
                )}
              </div>
            </div>
          ))}
          <div onClick={newCalendar}
            style={{ border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", minHeight: 68, transition: "all 0.15s", color: C.meta }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = C.meta; }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px" }}>New Calendar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
