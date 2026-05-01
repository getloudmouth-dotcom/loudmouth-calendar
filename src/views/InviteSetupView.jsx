import {
  SANS, MONO, C, DISP,
  INPUT as inputStyle,
  LABEL as labelStyle,
  BADGE,
  primaryBtn,
  AUTH_SHELL, AUTH_CARD,
} from "../theme";

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

  const disabled = inviteSetupBusy || !inviteName.trim() || !invitePassword;

  const onSubmit = (e) => {
    e.preventDefault();
    if (!disabled) saveInviteSetup();
  };

  return (
    <main style={AUTH_SHELL}>
      <div style={{ ...AUTH_CARD, maxWidth: 400 }}>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontFamily: DISP, fontSize: 22, letterSpacing: 1, color: C.accent, lineHeight: 1 }}>LOUDMOUTH HQ</div>
          <div style={{ fontSize: 10, color: C.meta, letterSpacing: "1.5px", fontFamily: MONO, textTransform: "uppercase", lineHeight: 1, marginTop: 4 }}>by Loudmouth</div>
        </div>

        <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8, lineHeight: 1.1, fontFamily: SANS }}>You're officially in.</div>
        <p style={{ fontSize: 13, color: C.meta, margin: "0 0 16px", lineHeight: 1.4, fontFamily: SANS }}>
          Confirm your details and set a password — that's all you need to keep coming back.
        </p>

        {inviteRole && (
          <div style={{ ...BADGE, display: "inline-block", background: C.surface2, color: C.meta, marginBottom: 24 }}>
            {ROLE_LABELS[inviteRole] || inviteRole}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <label style={labelStyle}>Name</label>
          <input autoComplete="name" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Your name" style={{ ...inputStyle, marginBottom: 16 }} />

          <label style={labelStyle}>Email</label>
          <input type="email" autoComplete="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="you@example.com" style={{ ...inputStyle, marginBottom: 16 }} />

          <label style={labelStyle}>Password</label>
          <input type="password" autoComplete="new-password" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} placeholder="Min. 8 characters" style={{ ...inputStyle, marginBottom: 16 }} />

          <label style={labelStyle}>Confirm Password</label>
          <input type="password" autoComplete="new-password" value={invitePasswordConfirm} onChange={e => setInvitePasswordConfirm(e.target.value)} placeholder="Same thing again" style={{ ...inputStyle, marginBottom: 24 }} />

          {inviteSetupError && (
            <div style={{ fontSize: 12, color: C.error, marginBottom: 16, fontWeight: 600, fontFamily: SANS, lineHeight: 1.3 }}>{inviteSetupError}</div>
          )}

          <button
            type="submit"
            disabled={disabled}
            style={{ ...primaryBtn, width: "100%", padding: "12px 0", opacity: disabled ? 0.4 : 1, cursor: disabled ? "default" : "pointer" }}
          >
            {inviteSetupBusy ? "Setting up..." : "Let's get loud →"}
          </button>
        </form>
      </div>
    </main>
  );
}
