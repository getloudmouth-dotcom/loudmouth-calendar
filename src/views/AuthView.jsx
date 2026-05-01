import {
  SANS, MONO, C, DISP,
  INPUT as inputStyle,
  LABEL as labelStyle,
  primaryBtn, btn,
  AUTH_SHELL, AUTH_CARD,
  SEGMENT_GROUP, segmentBtn,
} from "../theme";

export default function AuthView({ authMode, setAuthMode, authEmail, setAuthEmail, authPassword, setAuthPassword, authError, authBusy, signIn, signUp, resetPassword }) {
  const submit = authMode === "login" ? signIn : signUp;
  const isInfo = authError && authError.toLowerCase().includes("check");

  const onSubmit = (e) => {
    e.preventDefault();
    if (!authBusy) submit();
  };

  return (
    <main style={AUTH_SHELL}>
      <div style={{ ...AUTH_CARD, maxWidth: 360 }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontFamily: DISP, fontSize: 22, letterSpacing: 1, color: C.accent, lineHeight: 1 }}>LOUDMOUTH HQ</div>
          <div style={{ fontSize: 10, color: C.meta, letterSpacing: "1.5px", fontFamily: MONO, textTransform: "uppercase", lineHeight: 1, marginTop: 4 }}>by Loudmouth</div>
        </div>

        <div style={{ fontSize: 13, color: C.meta, fontFamily: SANS, lineHeight: 1.4, marginBottom: 24 }}>
          {authMode === "login" ? "Welcome back. Sign in to keep going." : "Create an account to get started."}
        </div>

        <div style={{ ...SEGMENT_GROUP, marginBottom: 24 }}>
          <button type="button" onClick={() => setAuthMode("login")} style={segmentBtn(authMode === "login")}>Log In</button>
          <button type="button" onClick={() => setAuthMode("signup")} style={segmentBtn(authMode === "signup")}>Sign Up</button>
        </div>

        <form onSubmit={onSubmit}>
          <label htmlFor="auth-email" style={labelStyle}>Email</label>
          <input id="auth-email" type="email" autoComplete="email" placeholder="you@example.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }} />

          <label htmlFor="auth-password" style={labelStyle}>Password</label>
          <input id="auth-password" type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} placeholder="••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }} />

          {authError && (
            <div style={{ fontSize: 12, color: isInfo ? C.success : C.error, marginBottom: 16, textAlign: "center", fontFamily: SANS, lineHeight: 1.3 }}>{authError}</div>
          )}

          <button
            type="submit"
            disabled={authBusy}
            style={{ ...primaryBtn, width: "100%", padding: "12px 0", opacity: authBusy ? 0.5 : 1, cursor: authBusy ? "default" : "pointer" }}
          >
            {authBusy ? "..." : authMode === "login" ? "Log In" : "Create Account"}
          </button>

          {authMode === "login" && (
            <button
              type="button"
              onClick={resetPassword}
              style={btn({ width: "100%", marginTop: 16, border: "none", background: "transparent", textTransform: "none", fontSize: 11, letterSpacing: 0, color: C.meta, textDecoration: "underline" })}
            >
              Forgot password?
            </button>
          )}
        </form>
      </div>
    </main>
  );
}
