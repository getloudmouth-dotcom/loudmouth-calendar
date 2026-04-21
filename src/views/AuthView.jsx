import { SANS, MONO, C, DISP, INPUT as inputStyle, LABEL as labelStyle } from "../theme";

export default function AuthView({ authMode, setAuthMode, authEmail, setAuthEmail, authPassword, setAuthPassword, authError, authBusy, signIn, signUp, resetPassword }) {
  return (
    <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: C.canvas, fontFamily: SANS }}>
      <div style={{ background: C.surface, borderRadius: 16, padding: 32, width: 360, border: `1px solid ${C.border}`, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: DISP, fontSize: 22, letterSpacing: 1, color: C.accent, lineHeight: 1 }}>LOUDMOUTH HQ</div>
          <div style={{ fontSize: 10, color: C.meta, letterSpacing: "1.5px", fontFamily: MONO, textTransform: "uppercase", lineHeight: 1, marginTop: 4 }}>by Loudmouth</div>
        </div>

        <div style={{ display: "flex", marginBottom: 24, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <button onClick={() => setAuthMode("login")} style={{ flex: 1, padding: "9px 0", background: authMode === "login" ? C.accent : "transparent", color: authMode === "login" ? "#000" : C.meta, border: "none", fontWeight: 700, fontSize: 10, cursor: "pointer", fontFamily: MONO, textTransform: "uppercase", letterSpacing: "1px", lineHeight: 1 }}>Log In</button>
          <button onClick={() => setAuthMode("signup")} style={{ flex: 1, padding: "9px 0", background: authMode === "signup" ? C.accent : "transparent", color: authMode === "signup" ? "#000" : C.meta, border: "none", fontWeight: 700, fontSize: 10, cursor: "pointer", fontFamily: MONO, textTransform: "uppercase", letterSpacing: "1px", lineHeight: 1 }}>Sign Up</button>
        </div>

        <label htmlFor="auth-email" style={labelStyle}>Email</label>
        <input id="auth-email" type="email" placeholder="you@example.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }} />

        <label htmlFor="auth-password" style={labelStyle}>Password</label>
        <input id="auth-password" type="password" placeholder="••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && (authMode === "login" ? signIn() : signUp())} style={{ ...inputStyle, marginBottom: 16 }} />

        {authError && (
          <div style={{ fontSize: 12, color: authError.includes("Check") ? "#7fd99e" : "#ff4444", marginBottom: 12, textAlign: "center", fontFamily: SANS, lineHeight: 1 }}>{authError}</div>
        )}

        <button onClick={authMode === "login" ? signIn : signUp} disabled={authBusy} style={{ width: "100%", padding: "11px 0", background: C.accent, color: "#000", border: "none", borderRadius: 24, fontWeight: 700, fontSize: 11, cursor: "pointer", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: MONO, lineHeight: 1 }}>
          {authBusy ? "..." : authMode === "login" ? "Log In" : "Create Account"}
        </button>

        {authMode === "login" && (
          <button onClick={resetPassword} style={{ background: "none", border: "none", fontSize: 10, color: C.meta, cursor: "pointer", marginTop: 14, width: "100%", fontFamily: MONO, textDecoration: "underline", lineHeight: 1 }}>
            Forgot password?
          </button>
        )}
      </div>
    </main>
  );
}
