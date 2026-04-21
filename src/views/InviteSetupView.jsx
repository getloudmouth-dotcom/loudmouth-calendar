const DISP = "'Anton', Impact, Helvetica, sans-serif";
const SANS = "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif";
const MONO = "'Space Mono', 'Courier New', monospace";
const C = {
  canvas:  "#131313",
  surface: "#1e1e1e",
  surface2:"#2a2a2a",
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
const labelStyle = {
  fontSize: 10, color: C.meta, textTransform: "uppercase", letterSpacing: "1.5px",
  display: "block", marginBottom: 4, fontWeight: 600, fontFamily: MONO, lineHeight: 1,
};

export default function InviteSetupView({
  inviteName, setInviteName,
  inviteEmail, setInviteEmail,
  invitePassword, setInvitePassword,
  invitePasswordConfirm, setInvitePasswordConfirm,
  inviteRole,
  saveInviteSetup,
  inviteSetupBusy,
  inviteSetupError,
}) {
  const ROLE_LABELS = {
    admin: "Admin",
    smm: "Social Media Manager",
    account_manager: "Account Manager",
    graphic_designer: "Graphic Designer",
    content_creator: "Content Creator",
    videographer: "Videographer",
    video_editor: "Video Editor",
    public_relations: "Public Relations",
  };

  return (
    <main style={{ minHeight: "100vh", background: C.canvas, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, padding: "24px 16px" }}>
      <div style={{ background: C.surface, borderRadius: 16, padding: 32, width: "100%", maxWidth: 400, border: `1px solid ${C.border}`, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: DISP, fontSize: 22, letterSpacing: 1, color: C.accent, lineHeight: 1 }}>LOUDMOUTH HQ</div>
          <div style={{ fontSize: 10, color: C.meta, letterSpacing: "1.5px", fontFamily: MONO, textTransform: "uppercase", lineHeight: 1, marginTop: 4 }}>by Loudmouth</div>
        </div>

        <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6, lineHeight: 1, fontFamily: SANS }}>You're officially in.</div>
        <p style={{ fontSize: 13, color: C.meta, margin: "0 0 10px", lineHeight: 1.4, fontFamily: SANS }}>
          Confirm your details and set a password — that's all you need to keep coming back.
        </p>

        {inviteRole && (
          <div style={{ display: "inline-block", background: C.surface2, color: C.meta, borderRadius: 20, padding: "3px 10px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 20, fontFamily: MONO, lineHeight: 1 }}>
            {ROLE_LABELS[inviteRole] || inviteRole}
          </div>
        )}

        <label style={labelStyle}>Name</label>
        <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Your name" style={{ ...inputStyle, marginBottom: 14 }} />

        <label style={labelStyle}>Email</label>
        <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="you@example.com" style={{ ...inputStyle, marginBottom: 14 }} />

        <label style={labelStyle}>Password</label>
        <input type="password" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} placeholder="Min. 8 characters" style={{ ...inputStyle, marginBottom: 14 }} />

        <label style={labelStyle}>Confirm Password</label>
        <input type="password" value={invitePasswordConfirm} onChange={e => setInvitePasswordConfirm(e.target.value)} placeholder="Same thing again" onKeyDown={e => e.key === "Enter" && saveInviteSetup()} style={{ ...inputStyle, marginBottom: 20 }} />

        {inviteSetupError && (
          <div style={{ fontSize: 12, color: "#ff4444", marginBottom: 14, fontWeight: 600, fontFamily: SANS, lineHeight: 1 }}>{inviteSetupError}</div>
        )}

        <button
          onClick={saveInviteSetup}
          disabled={inviteSetupBusy || !inviteName.trim() || !invitePassword}
          style={{ width: "100%", padding: "11px 0", background: C.accent, color: "#000", border: "none", borderRadius: 24, fontWeight: 700, fontSize: 11, cursor: (inviteSetupBusy || !inviteName.trim() || !invitePassword) ? "default" : "pointer", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: MONO, lineHeight: 1, opacity: (!inviteName.trim() || !invitePassword) ? 0.4 : 1 }}
        >
          {inviteSetupBusy ? "Setting up..." : "Let's get loud →"}
        </button>
      </div>
    </main>
  );
}
