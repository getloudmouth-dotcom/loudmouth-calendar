import { useApp } from "../AppContext";
import ScheduleRow from "../components/ScheduleRow";

export default function SchedulingPortal({ scheduledPosts, removeScheduledPost, toggleNotify, setActivePortal }) {
  const { user } = useApp();
  const today = new Date().toISOString().slice(0, 10);

  // Only show the current user's own rows in the list
  const myPosts = (scheduledPosts || []).filter(r => r.user_id === user?.id);
  const upcoming = myPosts.filter(r => r.post_date >= today);
  const past = myPosts.filter(r => r.post_date < today);

  // For each of my rows, compute who else is opted in for the same calendar+date
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
    <div>
      <div style={{ padding: "20px 60px", borderBottom: "1.5px solid #e8e8e8", display: "flex", alignItems: "center", gap: 16, background: "white" }}>
        <button onClick={() => setActivePortal(null)} style={{ background: "none", border: "none", fontSize: 13, color: "#888", cursor: "pointer", padding: "6px 0", fontWeight: 600 }}>← Back</button>
        <div style={{ width: 1, height: 18, background: "#e0e0e0" }} />
        <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e" }}>Content Scheduling</div>
      </div>
      <div style={{ padding: "36px 60px" }}>
        {myPosts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#aaa" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🗓</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No scheduled posts yet</div>
            <div style={{ fontSize: 13 }}>Open the Calendar Creator, then click "+ Schedule" on any calendar to add its posting dates here.</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: "#aaa", marginBottom: 20 }}>You'll get an email reminder each morning a post is due. Remove any dates you don't want.</div>
            {upcoming.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Upcoming ({upcoming.length})</div>
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
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#ccc", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Past ({past.length})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: 0.5 }}>
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
