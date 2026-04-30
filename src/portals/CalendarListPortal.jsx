import { useState } from "react";
import { MONTHS } from "../constants";
import { useApp } from "../AppContext";
import { SANS, MONO, C, btn, BTN_ROW, BADGE, PAGE_HEADER, PAGE_TITLE, DISPLAY_TITLE, DISPLAY_SUBTITLE } from "../theme";

export default function CalendarListPortal({
  allCalendars, calCreators,
  schedulingCalId, openCalendar, newCalendar, deleteCalendar, addToSchedule,
  setActivePortal,
  scheduledPosts,
}) {
  const { user } = useApp();
  const [hoveredCard, setHoveredCard] = useState(null);

  return (
    <div style={{ background: C.canvas, minHeight: "100vh", fontFamily: SANS }}>
      {/* Header */}
      <div style={PAGE_HEADER}>
        <div style={PAGE_TITLE}>Calendars</div>
        <div style={{ flex: 1 }} />
      </div>

      <div style={{ padding: "36px 48px" }}>
        <div style={{ marginBottom: 40 }}>
          <div style={DISPLAY_TITLE}>Calendars</div>
          <div style={DISPLAY_SUBTITLE}>{allCalendars.length} calendar{allCalendars.length !== 1 ? "s" : ""}</div>
        </div>
        {allCalendars.length === 0 && (
          <div style={{ padding: "80px 0" }}>
            <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", color: C.meta, marginBottom: 12 }}>No calendars yet</div>
            <div style={{ fontSize: 14, color: C.text, fontFamily: SANS, fontWeight: 700, marginBottom: 8 }}>Create your first calendar</div>
            <div style={{ fontSize: 13, color: C.meta, fontFamily: SANS }}>Click "+ New Calendar" in the grid below to get started.</div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {allCalendars.map(cal => (
            <div
              key={cal.id}
              style={{ position: "relative", background: C.surface, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, cursor: "pointer", transition: "border-color 0.15s" }}
              onClick={e => { if (e.target.closest("button")) return; openCalendar(cal); }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)"; setHoveredCard(cal.id); }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; setHoveredCard(null); }}
            >
              {cal.user_id === user?.id && (
                <button
                  onClick={e => { e.stopPropagation(); deleteCalendar(cal); }}
                  style={{
                    position: "absolute", top: 10, right: 10,
                    ...btn({ padding: "4px 7px", fontSize: 14, lineHeight: 1 }),
                    opacity: hoveredCard === cal.id ? 1 : 0,
                    pointerEvents: hoveredCard === cal.id ? "auto" : "none",
                    color: hoveredCard === cal.id ? C.meta : "transparent",
                    border: "none", background: "transparent",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.error; }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.meta; }}
                  title="Delete calendar"
                >×</button>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 15, flex: 1, color: C.text, fontFamily: SANS, lineHeight: 1 }}>{cal.client_name}</div>
                {cal.user_id !== user?.id && (
                  <span style={{ ...BADGE, background: "transparent", color: C.meta, border: `1px solid ${C.border}` }}>
                    By {calCreators?.[cal.user_id]?.name || "teammate"}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: C.meta, marginBottom: 10, fontFamily: MONO, lineHeight: 1 }}>{MONTHS[cal.month]} {cal.year} · {(cal.selected_days || []).length} day{(cal.selected_days || []).length !== 1 ? "s" : ""}</div>
              <div style={{ fontSize: 10, color: C.meta, marginBottom: 12, fontFamily: MONO, lineHeight: 1, opacity: 0.7 }}>
                Saved {new Date(cal.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
              <div style={{ ...BTN_ROW, marginTop: 4 }}>
                <button
                  onClick={e => { e.stopPropagation(); openCalendar(cal); }}
                  style={btn({ background: C.accent, color: "#000", border: "none", letterSpacing: "1.5px" })}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >Open</button>


                {(() => {
                  const isScheduled = (scheduledPosts || []).some(r => r.calendar_id === cal.id && r.user_id === user?.id);
                  const isBusy = schedulingCalId === cal.id;
                  return (
                    <button
                      onClick={e => { e.stopPropagation(); addToSchedule(cal); }}
                      disabled={isBusy}
                      title={isScheduled ? "Remove from reminder schedule" : "Add to reminder schedule"}
                      style={btn(isScheduled
                        ? { background: "rgba(204,255,0,0.1)", borderColor: C.accent, color: C.accent }
                        : {}
                      )}
                      onMouseEnter={e => { if (!isBusy && !isScheduled) { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; } }}
                      onMouseLeave={e => { if (!isScheduled) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.meta; } }}
                    >
                      {isBusy ? "·  ·  ·" : isScheduled ? "Scheduled" : "Schedule"}
                    </button>
                  );
                })()}

              </div>
            </div>
          ))}
          <button onClick={newCalendar} aria-label="Create new calendar"
            style={{ border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", minHeight: 68, transition: "all 0.15s", color: C.meta, background: "transparent", width: "100%" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = C.meta; }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px" }}>New Calendar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
