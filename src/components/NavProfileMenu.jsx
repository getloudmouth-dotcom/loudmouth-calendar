import { useState } from "react";
import NavMenuItem from "./NavMenuItem";

export default function NavProfileMenu({ profileName, userEmail, currentCalendarId, onMyCalendars, onHistory, onEditProfile, onSignOut }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: open ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.1)", border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "background 0.15s", width: "100%" }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#D7FA06", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#111", flexShrink: 0 }}>
          {profileName ? profileName[0].toUpperCase() : "?"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#ccc", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profileName}</span>
          {userEmail && <span style={{ fontSize: 10, color: "#555", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</span>}
        </div>
        <span style={{ fontSize: 9, color: "#555", transition: "transform 0.15s", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "white", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", minWidth: 190, overflow: "hidden", zIndex: 200 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{profileName}</div>
              {userEmail && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{userEmail}</div>}
            </div>
            {currentCalendarId && <NavMenuItem onClick={() => { setOpen(false); onMyCalendars(); }}>🗂 My Calendars</NavMenuItem>}
            {currentCalendarId && <NavMenuItem onClick={() => { setOpen(false); onHistory(); }}>🕓 Version History</NavMenuItem>}
            <NavMenuItem onClick={() => { setOpen(false); onEditProfile(); }}>✏️ Edit Profile</NavMenuItem>
            <div style={{ borderTop: "1px solid #f0f0f0" }}>
              <NavMenuItem onClick={() => { setOpen(false); onSignOut(); }} color="#E8001C">Sign out</NavMenuItem>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
