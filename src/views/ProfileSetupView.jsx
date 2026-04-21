const DISP = "'Anton', Impact, Helvetica, sans-serif";
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

const inputStyle = {
  width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`,
  borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box",
  background: C.canvas, color: C.text, fontFamily: SANS, lineHeight: 1,
};

export default function ProfileSetupView({ profileInput, setProfileInput, saveProfile, profilePhone, setProfilePhone, profileSmsConsent, setProfileSmsConsent }) {
  return (
    <div style={{ minHeight: "100vh", background: C.canvas, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS }}>
      <div style={{ background: C.surface, borderRadius: 16, padding: 32, width: 380, border: `1px solid ${C.border}`, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: DISP, fontSize: 20, letterSpacing: 1, color: C.accent, lineHeight: 1 }}>LOUDMOUTH HQ</div>
          <div style={{ fontSize: 10, color: C.meta, letterSpacing: "1.5px", fontFamily: MONO, textTransform: "uppercase", lineHeight: 1, marginTop: 4 }}>by Loudmouth</div>
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 6, lineHeight: 1, fontFamily: SANS }}>One quick thing.</div>
        <p style={{ fontSize: 13, color: C.meta, marginBottom: 20, lineHeight: 1, fontFamily: SANS }}>Tell us your name and optionally your phone number for SMS notifications.</p>

        <input
          autoFocus
          value={profileInput}
          onChange={e => setProfileInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && saveProfile()}
          placeholder="e.g. Julio Castillo"
          style={{ ...inputStyle, marginBottom: 12 }}
        />
        <input
          type="tel"
          value={profilePhone}
          onChange={e => setProfilePhone(e.target.value)}
          placeholder="+1 (956) 555-0100"
          style={{ ...inputStyle, marginBottom: 16 }}
        />

        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={profileSmsConsent}
            onChange={e => setProfileSmsConsent(e.target.checked)}
            style={{ marginTop: 2, flexShrink: 0, accentColor: C.accent }}
          />
          <span style={{ fontSize: 12, color: C.meta, lineHeight: 1.4, fontFamily: SANS }}>
            I agree to receive SMS notifications for scheduling, approvals, and team updates from Loudmouth. Reply STOP at any time to opt out.{" "}
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontWeight: 700 }}>Privacy Policy</a>
          </span>
        </label>

        <button onClick={saveProfile} disabled={!profileInput.trim()} style={{ width: "100%", padding: "11px 0", background: C.accent, color: "#000", border: "none", borderRadius: 24, fontWeight: 700, fontSize: 11, cursor: profileInput.trim() ? "pointer" : "default", opacity: profileInput.trim() ? 1 : 0.4, letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: MONO, lineHeight: 1 }}>
          Let's go →
        </button>
      </div>
    </div>
  );
}
