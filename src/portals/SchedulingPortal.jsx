import { useApp } from "../AppContext";
import ScheduleRow from "../components/ScheduleRow";

const SANS = "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif";
const MONO = "'Space Mono', 'Courier New', monospace";

const C = {
  canvas:  "#131313",
  surface: "#1e1e1e",
  accent:  "#CCFF00",
  text:    "#ffffff",
  meta:    "#949494",
  border:  "rgba(255,255,255,0.14)",
};

function SectionHeader({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.8px", color: C.meta, whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

export default function SchedulingPortal({ scheduledPosts, removeScheduledPost, toggleNotify, setActivePortal }) {
  const { user } = useApp();
  const today = new Date().toISOString().slice(0, 10);

  const myPosts = (scheduledPosts || []).filter(r => r.user_id === user?.id);
  const upcoming = myPosts.filter(r => r.post_date >= today);
  const past = myPosts.filter(r => r.post_date < today);

  function getOptedInUsers(row) {
    return (scheduledPosts || [])
      .filter(r => r.calendar_id === row.calendar_id && r.post_date === row.post_date)
      .map(r => ({
        userId: r.user_id,
        rowId: r.id,
        name: r.profile?.name || "",
        email: r.profile?.email || "",
        notify: r.notify !== false,
      }));
  }

  return (
    <div style={{ background: C.canvas, minHeight: "100vh", fontFamily: SANS }}>
      <div style={{ padding: "40px 48px 80px" }}>
        {/* Page title */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "2px", color: C.meta, marginBottom: 8 }}>Scheduling</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: -0.5 }}>Content Schedule</div>
          {myPosts.length > 0 && (
            <div style={{ marginTop: 8, fontFamily: SANS, fontSize: 13, color: C.meta }}>
              We'll email you the morning it's due. So you can pretend you remembered on your own.
            </div>
          )}
        </div>

        {myPosts.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🗓</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.text, fontFamily: SANS }}>No scheduled posts yet</div>
            <div style={{ fontSize: 13, color: C.meta, textAlign: "center", maxWidth: 360 }}>
              Open the Calendar Creator, then click "+ Schedule" on any calendar to add its posting dates here.
            </div>
          </div>
        ) : (
          <div>
            {upcoming.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <SectionHeader label={`Upcoming · ${upcoming.length}`} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {upcoming.map(row => (
                    <ScheduleRow
                      key={row.id}
                      row={row}
                      onRemove={removeScheduledPost}
                      onToggleNotify={toggleNotify}
                      currentUserId={user?.id}
                      optedInUsers={getOptedInUsers(row)}
                    />
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div style={{ opacity: 0.55 }}>
                <SectionHeader label={`Past · ${past.length}`} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {past.map(row => (
                    <ScheduleRow
                      key={row.id}
                      row={row}
                      onRemove={removeScheduledPost}
                      onToggleNotify={toggleNotify}
                      currentUserId={user?.id}
                      optedInUsers={getOptedInUsers(row)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
