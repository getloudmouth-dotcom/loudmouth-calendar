export default function ProfileSetupView({ profileInput, setProfileInput, saveProfile }) {
  return (
    <div style={{ minHeight: "100vh", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ background: "white", borderRadius: 16, padding: 40, width: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: "0.08em", color: "#1a1a2e", whiteSpace: "nowrap" }}>SMM CALENDAR CREATOR</div>
          <div style={{ fontSize: 11, color: "#aaa", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>by LOUDMOUTH CREATIVE</div>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 6 }}>One quick thing.</h2>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>What's your name? This shows up in the calendar footer and on your account.</p>
        <input
          autoFocus
          value={profileInput}
          onChange={e => setProfileInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && saveProfile()}
          placeholder="e.g. Julio Castillo"
          style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16 }}
        />
        <button onClick={saveProfile} disabled={!profileInput.trim()} style={{ width: "100%", padding: "12px 0", background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: profileInput.trim() ? "pointer" : "default", opacity: profileInput.trim() ? 1 : 0.4, letterSpacing: "0.04em" }}>
          Let's go →
        </button>
      </div>
    </div>
  );
}
