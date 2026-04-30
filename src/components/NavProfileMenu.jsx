import { useState } from "react";
import NavMenuItem from "./NavMenuItem";

import { SANS, MONO, C } from "../theme";

export default function NavProfileMenu({ profileName, userEmail, currentCalendarId, onMyCalendars, onHistory, onEditProfile, onSignOut, isAdmin, onAdminPortal, hasBilling, onBillingPortal }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: open ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)", border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "background 0.15s", width: "100%" }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#000", flexShrink: 0, fontFamily: MONO, lineHeight: 1 }}>
          {profileName ? profileName[0].toUpperCase() : "?"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0, gap: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: SANS, lineHeight: 1 }}>{profileName}</span>
          {userEmail && <span style={{ fontSize: 10, color: C.meta, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: MONO, lineHeight: 1 }}>{userEmail}</span>}
        </div>
        <span style={{ fontSize: 9, color: C.meta, transition: "transform 0.15s", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)", lineHeight: 1 }}>▾</span>
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.5)", minWidth: 200, overflow: "hidden", zIndex: 200 }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: SANS, lineHeight: 1, marginBottom: 4 }}>{profileName}</div>
              {userEmail && <div style={{ fontSize: 10, color: C.meta, fontFamily: MONO, lineHeight: 1 }}>{userEmail}</div>}
            </div>
            {currentCalendarId && <NavMenuItem onClick={() => { setOpen(false); onMyCalendars(); }}>My Calendars</NavMenuItem>}
            {currentCalendarId && <NavMenuItem onClick={() => { setOpen(false); onHistory(); }}>Version History</NavMenuItem>}
            <NavMenuItem onClick={() => { setOpen(false); onEditProfile(); }}>Edit Profile</NavMenuItem>
            {(isAdmin || hasBilling) && (
              <div style={{ borderTop: `1px solid ${C.border}` }}>
                {hasBilling && <NavMenuItem onClick={() => { setOpen(false); onBillingPortal(); }}>Billing</NavMenuItem>}
                {isAdmin && <NavMenuItem onClick={() => { setOpen(false); onAdminPortal(); }}>Admin Portal</NavMenuItem>}
              </div>
            )}
            <div style={{ borderTop: `1px solid ${C.border}` }}>
              <NavMenuItem onClick={() => { setOpen(false); onSignOut(); }} color={C.error}>Sign out</NavMenuItem>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
