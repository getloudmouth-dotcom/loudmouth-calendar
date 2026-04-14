export default function CollabAvatars({ collaborators }) {
  if (!collaborators?.length) return null;
  const shown = collaborators.slice(0, 3);
  const overflow = collaborators.length - shown.length;
  const colors = ["#4f6ef7", "#e06c75", "#56b6c2", "#98c379"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 10 }}>
      {shown.map((c, i) => (
        <div key={c.user_id} title={`${c.name} (${c.permission})`} style={{ width: 26, height: 26, borderRadius: "50%", background: colors[i % colors.length], color: "white", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white", marginLeft: i === 0 ? 0 : -6, zIndex: shown.length - i, position: "relative", cursor: "default" }}>
          {(c.name || "?")[0].toUpperCase()}
        </div>
      ))}
      {overflow > 0 && (
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#ddd", color: "#666", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white", marginLeft: -6, position: "relative" }}>
          +{overflow}
        </div>
      )}
      <span style={{ fontSize: 10, color: "#bbb", marginLeft: 4 }}>shared</span>
    </div>
  );
}
