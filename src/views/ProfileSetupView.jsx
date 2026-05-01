import {
  SANS, MONO, C, DISP,
  INPUT as inputStyle,
  LABEL as labelStyle,
  primaryBtn,
  AUTH_SHELL, AUTH_CARD,
} from "../theme";

export default function ProfileSetupView({ profileInput, setProfileInput, saveProfile, profilePhone, setProfilePhone, profileSmsConsent, setProfileSmsConsent }) {
  const disabled = !profileInput.trim();

  const onSubmit = (e) => {
    e.preventDefault();
    if (!disabled) saveProfile();
  };

  return (
    <main style={AUTH_SHELL}>
      <div style={{ ...AUTH_CARD, maxWidth: 380 }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontFamily: DISP, fontSize: 20, letterSpacing: 1, color: C.accent, lineHeight: 1 }}>LOUDMOUTH HQ</div>
          <div style={{ fontSize: 10, color: C.meta, letterSpacing: "1.5px", fontFamily: MONO, textTransform: "uppercase", lineHeight: 1, marginTop: 4 }}>by Loudmouth</div>
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8, lineHeight: 1.1, fontFamily: SANS }}>One quick thing.</div>
        <p style={{ fontSize: 13, color: C.meta, margin: "0 0 24px", lineHeight: 1.4, fontFamily: SANS }}>
          Tell us your name and optionally your phone number for SMS notifications.
        </p>

        <form onSubmit={onSubmit}>
          <label style={labelStyle}>Name</label>
          <input
            autoFocus
            autoComplete="name"
            value={profileInput}
            onChange={e => setProfileInput(e.target.value)}
            placeholder="e.g. Julio Castillo"
            style={{ ...inputStyle, marginBottom: 16 }}
          />

          <label style={labelStyle}>Phone (optional)</label>
          <input
            type="tel"
            autoComplete="tel"
            value={profilePhone}
            onChange={e => setProfilePhone(e.target.value)}
            placeholder="+1 (956) 555-0100"
            style={{ ...inputStyle, marginBottom: 20 }}
          />

          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 24, cursor: "pointer" }}>
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

          <button
            type="submit"
            disabled={disabled}
            style={{ ...primaryBtn, width: "100%", padding: "12px 0", opacity: disabled ? 0.4 : 1, cursor: disabled ? "default" : "pointer" }}
          >
            Let's go →
          </button>
        </form>
      </div>
    </main>
  );
}
