export default function AuthView({ authMode, setAuthMode, authEmail, setAuthEmail, authPassword, setAuthPassword, authError, authBusy, signIn, signUp, resetPassword }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#1a1a2e", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ background: "white", borderRadius: 16, padding: 40, width: 360, boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ marginBottom: 28, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: "0.08em", color: "#1a1a2e", whiteSpace: "nowrap" }}>LOUDMOUTH HQ</div>
          <div style={{ fontSize: 11, color: "#aaa", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>by Loudmouth</div>
        </div>
        <div style={{ display: "flex", gap: 0, marginBottom: 24, border: "1.5px solid #e0e0e0", borderRadius: 8, overflow: "hidden" }}>
          <button onClick={() => setAuthMode("login")} style={{ flex: 1, padding: "9px 0", background: authMode === "login" ? "#1a1a2e" : "white", color: authMode === "login" ? "#D7FA06" : "#aaa", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Log In</button>
          <button onClick={() => setAuthMode("signup")} style={{ flex: 1, padding: "9px 0", background: authMode === "signup" ? "#1a1a2e" : "white", color: authMode === "signup" ? "#D7FA06" : "#aaa", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Sign Up</button>
        </div>
        <label htmlFor="auth-email" style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4, fontWeight: 600 }}>Email</label>
        <input id="auth-email" type="email" placeholder="you@example.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, marginBottom: 14, outline: "none", boxSizing: "border-box" }} />
        <label htmlFor="auth-password" style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4, fontWeight: 600 }}>Password</label>
        <input id="auth-password" type="password" placeholder="••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && (authMode === "login" ? signIn() : signUp())} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, marginBottom: 16, outline: "none", boxSizing: "border-box" }} />
        {authError && <div style={{ fontSize: 12, color: authError.includes("Check") ? "#22aa66" : "#E8001C", marginBottom: 12, textAlign: "center" }}>{authError}</div>}
        <button onClick={authMode === "login" ? signIn : signUp} disabled={authBusy} style={{ width: "100%", padding: "12px 0", background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: "pointer", letterSpacing: "0.06em" }}>
          {authBusy ? "..." : authMode === "login" ? "LOG IN" : "CREATE ACCOUNT"}
        </button>
        {authMode === "login" && (
          <button onClick={resetPassword} style={{ background: "none", border: "none", fontSize: 11, color: "#aaa", cursor: "pointer", marginTop: 12, width: "100%", textDecoration: "underline" }}>
            Forgot password?
          </button>
        )}
      </div>
    </div>
  );
}
