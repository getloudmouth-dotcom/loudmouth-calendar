import { MONTHS } from "../constants";
import { useApp } from "../AppContext";
import CollabAvatars from "../components/CollabAvatars";

export default function CalendarListPortal({
  allCalendars, calCollaborators,
  schedulingCalId, openCalendar, newCalendar, deleteCalendar, addToSchedule,
  setShareModal, setShareEmail, setShareError,
  setActivePortal,
  scheduledPosts,
}) {
  const { user } = useApp();

  return (
    <div>
      <div style={{ padding: "20px 60px", borderBottom: "1.5px solid #e8e8e8", display: "flex", alignItems: "center", gap: 16, background: "white" }}>
        <button onClick={() => setActivePortal(null)} style={{ background: "none", border: "none", fontSize: 13, color: "#888", cursor: "pointer", padding: "6px 0", fontWeight: 600 }}>← Back</button>
        <div style={{ width: 1, height: 18, background: "#e0e0e0" }} />
        <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e" }}>Calendar Creator</div>
        <div style={{ flex: 1 }} />
        <button onClick={newCalendar} style={{ background: "#1a1a2e", color: "#D7FA06", border: "none", padding: "10px 22px", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", letterSpacing: "0.04em" }}>+ New Calendar</button>
      </div>
      <div style={{ padding: "36px 60px" }}>
        {allCalendars.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#aaa" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📅</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No calendars yet</div>
            <div style={{ fontSize: 13 }}>Hit "+ New Calendar" to get started</div>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {allCalendars.map(cal => (
            <div key={cal.id} className="cal-card" style={{ background: "white", borderRadius: 12, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: "1.5px solid #e8e8e8", cursor: "pointer" }} onClick={e => { if (e.target.closest('button')) return; openCalendar(cal); }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ fontWeight: 800, fontSize: 16, flex: 1 }}>{cal.client_name}</div>
                {cal.user_id !== user?.id && (
                  <span style={{ background: "#f0f4ff", color: "#4466cc", fontSize: 10, fontWeight: 800, borderRadius: 5, padding: "3px 7px", letterSpacing: "0.04em" }}>SHARED</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 14 }}>{MONTHS[cal.month]} {cal.year} · {(cal.selected_days || []).length} day{(cal.selected_days || []).length !== 1 ? "s" : ""}</div>
              <div style={{ fontSize: 11, color: "#bbb", marginBottom: 10 }}>Last saved {new Date(cal.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {new Date(cal.updated_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</div>
              <CollabAvatars collaborators={calCollaborators[cal.id]} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={e => { e.stopPropagation(); openCalendar(cal); }} style={{ flex: 1, background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 7, padding: "8px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Open</button>
                {cal.user_id === user?.id && (
                  <button onClick={e => { e.stopPropagation(); setShareModal({ cal }); setShareEmail(""); setShareError(""); }} title="Share with collaborators" style={{ background: "#f0f0ee", color: "#555", border: "1.5px solid #e0e0e0", borderRadius: 7, padding: "8px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Share</button>
                )}
                {(() => {
                  const isScheduled = (scheduledPosts || []).some(r => r.calendar_id === cal.id && r.user_id === user?.id);
                  const isBusy = schedulingCalId === cal.id;
                  return (
                    <button
                      onClick={e => { e.stopPropagation(); addToSchedule(cal); }}
                      disabled={isBusy}
                      title={isScheduled ? "Remove posting dates from your reminder schedule" : "Add posting dates to your reminder schedule"}
                      style={{ background: isScheduled ? "#D7FA06" : "#f5fbda", color: isScheduled ? "#1a1a2e" : "#5a7a00", border: `1.5px solid ${isScheduled ? "#b8d800" : "#D7FA06"}`, borderRadius: 7, padding: "8px 10px", fontSize: 12, fontWeight: 700, cursor: isBusy ? "default" : "pointer", whiteSpace: "nowrap", opacity: isBusy ? 0.6 : 1 }}
                    >
                      {isBusy ? "..." : isScheduled ? "✓ Scheduled" : "+ Schedule"}
                    </button>
                  );
                })()}
                {cal.user_id === user?.id && (
                  <button onClick={e => { e.stopPropagation(); deleteCalendar(cal); }} aria-label="Delete calendar" title="Delete calendar" style={{ background: "none", border: "1.5px solid #eee", color: "#ccc", borderRadius: 7, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}>🗑</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
