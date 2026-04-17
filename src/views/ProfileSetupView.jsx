export default function ProfileSetupView({ profileInput, setProfileInput, saveProfile, profilePhone, setProfilePhone, profileSmsConsent, setProfileSmsConsent }) {
  return (
    <div style={{ minHeight: "100vh", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ background: "white", borderRadius: 16, padding: 40, width: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: "0.08em", color: "#1a1a2e", whiteSpace: "nowrap" }}>LOUDMOUTH HQ</div>
          <div style={{ fontSize: 11, color: "#aaa", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>by Loudmouth</div>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 6 }}>One quick thing.</h2>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>Tell us your name and optionally your phone number for SMS notifications.</p>
        <input
          autoFocus
          value={profileInput}
          onChange={e => setProfileInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && saveProfile()}
          placeholder="e.g. Julio Castillo"
          style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
        />
        <input
          type="tel"
          value={profilePhone}
          onChange={e => setProfilePhone(e.target.value)}
          placeholder="+1 (956) 555-0100"
          style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16 }}
        />
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={profileSmsConsent}
            onChange={e => setProfileSmsConsent(e.target.checked)}
            style={{ marginTop: 2, flexShrink: 0, accentColor: "#1a1a2e" }}
          />
          <span style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>
            I agree to receive SMS notifications for scheduling, approvals, and team updates from Loudmouth. Reply STOP at any time to opt out.{" "}
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: "#1a1a2e", fontWeight: 700 }}>Privacy Policy</a>
          </span>
        </label>
        <button onClick={saveProfile} disabled={!profileInput.trim()} style={{ width: "100%", padding: "12px 0", background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: profileInput.trim() ? "pointer" : "default", opacity: profileInput.trim() ? 1 : 0.4, letterSpacing: "0.04em" }}>
          Let's go →
        </button>
      </div>
    </div>
  );
}
