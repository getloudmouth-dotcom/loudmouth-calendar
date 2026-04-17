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
    <div style={{ minHeight: "100vh", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Helvetica Neue', Arial, sans-serif", padding: "24px 16px" }}>
      <div style={{ background: "white", borderRadius: 16, padding: 40, width: "100%", maxWidth: 400, boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: "0.08em", color: "#1a1a2e" }}>LOUDMOUTH HQ</div>
          <div style={{ fontSize: 11, color: "#aaa", letterSpacing: "0.06em" }}>by Loudmouth</div>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a2e", margin: "0 0 6px" }}>
          You're officially in.
        </h2>
        <p style={{ fontSize: 13, color: "#888", margin: "0 0 8px", lineHeight: 1.5 }}>
          Confirm your details and set a password — that's all you need to keep coming back.
        </p>
        {inviteRole && (
          <div style={{ display: "inline-block", background: "#f0f0ee", color: "#555", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 24 }}>
            {ROLE_LABELS[inviteRole] || inviteRole}
          </div>
        )}

        <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, display: "block", marginBottom: 4 }}>Name</label>
        <input
          value={inviteName}
          onChange={e => setInviteName(e.target.value)}
          placeholder="Your name"
          style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 14 }}
        />

        <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, display: "block", marginBottom: 4 }}>Email</label>
        <input
          type="email"
          value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 14 }}
        />

        <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, display: "block", marginBottom: 4 }}>Password</label>
        <input
          type="password"
          value={invitePassword}
          onChange={e => setInvitePassword(e.target.value)}
          placeholder="Min. 8 characters"
          style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 14 }}
        />

        <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, display: "block", marginBottom: 4 }}>Confirm Password</label>
        <input
          type="password"
          value={invitePasswordConfirm}
          onChange={e => setInvitePasswordConfirm(e.target.value)}
          placeholder="Same thing again"
          onKeyDown={e => e.key === "Enter" && saveInviteSetup()}
          style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 20 }}
        />

        {inviteSetupError && (
          <div style={{ fontSize: 12, color: "#E8001C", marginBottom: 14, fontWeight: 600 }}>{inviteSetupError}</div>
        )}

        <button
          onClick={saveInviteSetup}
          disabled={inviteSetupBusy || !inviteName.trim() || !invitePassword}
          style={{ width: "100%", padding: "13px 0", background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: (inviteSetupBusy || !inviteName.trim() || !invitePassword) ? "default" : "pointer", letterSpacing: "0.06em", opacity: (!inviteName.trim() || !invitePassword) ? 0.4 : 1 }}
        >
          {inviteSetupBusy ? "Setting up..." : "Let's get loud →"}
        </button>

      </div>
    </div>
  );
}
