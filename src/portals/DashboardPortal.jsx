import { useState } from "react";
import { MONTHS } from "../constants";
import { useApp } from "../AppContext";
import Toast from "../components/Toast";
import NavProfileMenu from "../components/NavProfileMenu";
import CalendarListPortal from "./CalendarListPortal";
import SchedulingPortal from "./SchedulingPortal";
import AdminPortal from "./AdminPortal";
import ContentPlanPortal from "./ContentPlanPortal";
import BillingPortal from "./BillingPortal";

const DISP = "'Anton', Impact, Helvetica, sans-serif";
const SANS = "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif";
const MONO = "'Space Mono', 'Courier New', monospace";

const C = {
  canvas:  "#131313",
  surface: "#1e1e1e",
  surface2:"#2a2a2a",
  accent:  "#CCFF00",   // brand chartreuse (replaces design's #D7FA06)
  text:    "#ffffff",
  meta:    "#949494",
  border:  "rgba(255,255,255,0.14)",
};

// Portal tile colors matching the design (user's chartreuse replaces mint slot)
const PORTAL_TILES = [
  { key:"calendar_creator",     label:"Calendar Creator",     desc:"Build content calendars and export PDFs for clients.",       tile: C.accent,  textColor:"#000" },
  { key:"content_scheduling",   label:"Content Scheduling",   desc:"Schedule posting dates and get daily email reminders.",      tile:"#5200ff",  textColor:"#fff" },
  { key:"content_plan_creator", label:"Content Plan Creator", desc:"Build shoot-ready content plans and share with clients.",    tile:"#3cffd0",  textColor:"#000" },
  { key:"admin_portal",         label:"Admin Portal",         desc:"Manage team members, roles, and tool access permissions.",   tile:"#ff3c6e",  textColor:"#fff" },
  { key:"billing",              label:"Billing",              desc:"Create invoices, track payments, and manage client billing.", tile:"#ff7a00",  textColor:"#000" },
];

const PORTAL_KEY_MAP = {
  calendar_creator:     "calendar",
  content_scheduling:   "scheduling",
  content_plan_creator: "content-plan",
  admin_portal:         "admin",
  billing:              "billing",
};

function MonoLabel({ children, color = C.meta, size = 11, tracking = 1.5, style = {} }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: size, fontWeight: 600, textTransform: "uppercase", letterSpacing: tracking, color, ...style }}>
      {children}
    </div>
  );
}

function DashboardHub({ setActivePortal, profileName, allCalendars, allContentPlans, scheduledPosts, newCalendar, can, loadAllContentPlans, loadAdminUsers, loadRoleToolDefaults, adminUsers, roleToolDefaults }) {
  const today = new Date();
  const greeting = today.getHours() < 12 ? "morning" : today.getHours() < 17 ? "afternoon" : "evening";
  const recentCals = [...allCalendars].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 3);
  const upcomingCount = scheduledPosts.filter(r => r.post_date >= today.toISOString().slice(0, 10)).length;

  const badgeMap = {
    content_scheduling:   upcomingCount,
    content_plan_creator: 0,
    calendar_creator:     0,
    admin_portal:         0,
    billing:              0,
  };
  const countMap = {
    calendar_creator:     `${allCalendars.length} calendar${allCalendars.length !== 1 ? "s" : ""}`,
    content_scheduling:   `${upcomingCount} upcoming`,
    content_plan_creator: `${allContentPlans.length} plan${allContentPlans.length !== 1 ? "s" : ""}`,
    admin_portal:         "team",
    billing:              "invoices",
  };

  function openPortal(key) {
    const navKey = PORTAL_KEY_MAP[key];
    if (key === "content_plan_creator") loadAllContentPlans();
    if (key === "admin_portal") {
      if (adminUsers.length === 0) loadAdminUsers();
      if (!roleToolDefaults) loadRoleToolDefaults();
    }
    setActivePortal(navKey);
  }

  const visibleTiles = PORTAL_TILES.filter(p => can(p.key));

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 48px 80px" }}>

      {/* ── Masthead ── */}
      <div style={{ marginBottom: 48, paddingBottom: 32, borderBottom: `1px solid ${C.border}` }}>
        <MonoLabel color={C.accent} style={{ marginBottom: 12 }}>
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </MonoLabel>
        <div style={{ fontFamily: DISP, fontSize: 72, lineHeight: 0.9, letterSpacing: 1, color: C.text }}>
          LOUDMOUTH<br /><span style={{ color: C.accent }}>HQ</span>
        </div>
        <div style={{ marginTop: 16, fontFamily: SANS, fontWeight: 300, fontSize: 16, color: C.meta, letterSpacing: 0.5 }}>
          Good {greeting}{profileName ? `, ${profileName.split(" ")[0]}` : ""}.
        </div>
      </div>

      {/* ── Recently Edited ── */}
      {allCalendars.length > 0 && (
        <>
          <MonoLabel style={{ marginBottom: 14 }}>Recently Edited</MonoLabel>
          <div style={{ display: "flex", gap: 12, marginBottom: 48, flexWrap: "wrap" }}>
            {recentCals.map(cal => (
              <div key={cal.id} onClick={() => setActivePortal("calendar")}
                style={{ flex: "1 1 200px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "border-color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: C.accent, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#000", lineHeight: 1 }}>{MONTHS[cal.month].slice(0, 3)}</span>
                  <span style={{ fontFamily: MONO, fontWeight: 400, fontSize: 8, color: "rgba(0,0,0,0.5)", letterSpacing: 0.5, lineHeight: 1.4 }}>{cal.year}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: SANS }}>{cal.client_name}</div>
                  <MonoLabel style={{ marginTop: 2 }}>{MONTHS[cal.month]} {cal.year}</MonoLabel>
                </div>
                <MonoLabel>
                  {cal.updated_at ? new Date(cal.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                </MonoLabel>
              </div>
            ))}
            <div onClick={newCalendar}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px 28px", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 16, cursor: "pointer", color: C.meta, transition: "all 0.15s", fontFamily: MONO, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, whiteSpace: "nowrap" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = C.meta; }}>
              + New Calendar
            </div>
          </div>
        </>
      )}

      {/* ── Portal tiles ── */}
      <MonoLabel style={{ marginBottom: 14 }}>Portals</MonoLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {visibleTiles.map((p, i) => {
          const badge = badgeMap[p.key];
          const count = countMap[p.key];
          return (
            <div key={p.key} onClick={() => openPortal(p.key)}
              style={{ background: p.tile, borderRadius: 20, padding: "28px 26px 22px", cursor: "pointer", display: "flex", flexDirection: "column", transition: "filter 0.15s", animationDelay: `${i * 0.07}s` }}
              onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.08)"}
              onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                <MonoLabel color={p.textColor === "#000" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)"} size={11} tracking={1.8}>
                  {count}
                </MonoLabel>
                {badge > 0 && (
                  <span style={{ background: "#000", color: p.tile, fontFamily: MONO, fontSize: 10, fontWeight: 700, textTransform: "uppercase", borderRadius: 20, padding: "2px 8px", letterSpacing: 1 }}>
                    {badge} new
                  </span>
                )}
              </div>
              <div style={{ fontFamily: DISP, fontSize: 38, lineHeight: 0.9, letterSpacing: 0.5, color: p.textColor, marginBottom: 14 }}>
                {p.label.toUpperCase()}
              </div>
              <div style={{ fontSize: 13, fontWeight: 400, color: p.textColor === "#000" ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.65)", lineHeight: 1.55, flex: 1, fontFamily: SANS }}>
                {p.desc}
              </div>
              <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: p.textColor, opacity: 0.7 }}>
                  Open →
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPortal({
  activePortal, setActivePortal,
  profileName, profileInput, setProfileInput, saveProfile, editingProfile, setEditingProfile,
  exporting, exportProgress, exportElapsed,
  allCalendars, calCollaborators, schedulingCalId,
  openCalendar, newCalendar, deleteCalendar, addToSchedule,
  setShareModal, setShareEmail, setShareError,
  shareModal, shareEmail, shareError, shareBusy, addCollaborator, removeCollaborator,
  sharePermission, setSharePermission,
  scheduledPosts, removeScheduledPost, toggleNotify,
  adminUsers, adminLoading,
  roleToolDefaults, rolePermsBusy, saveRoleToolDefaults,
  inviteModal, setInviteModal, inviteForm, setInviteForm,
  inviteBusy, inviteError, setInviteError, doInviteUser,
  editingUser, setEditingUser, editUserForm, setEditUserForm,
  editUserBusy, doUpdateUser, doDeleteUser, deleteUserBusy, currentUserId,
  currentCPId, setCurrentCPId, activeCPStep, setActiveCPStep,
  cpClientName, setCpClientName, cpMonth, setCpMonth, cpYear, setCpYear,
  cpShootDate, setCpShootDate, cpProducedCount, setCpProducedCount,
  cpOrganicCount, setCpOrganicCount, cpItems, setCpItems, cpSaving,
  allContentPlans, clients, setClients, cpClientId, setCpClientId, addingClient, setAddingClient,
  newClientInput, setNewClientInput,
  newContentPlan, openContentPlan, saveContentPlan, deleteContentPlan, generateCPItems, updateCPItem,
  getOrCreateShareToken,
  cpShareModal, setCpShareModal, cpShareEmail, setCpShareEmail,
  cpShareMethod, setCpShareMethod,
  cpShareBusy, setCpShareBusy, cpShareError, setCpShareError,
  cpShareSuccess, setCpShareSuccess,
  doSendContentPlan,
  cpReferenceImages, addCPReferenceImages, removeCPReferenceImage,
  pinterestToken, setPinterestToken,
  pinterestOpen, setPinterestOpen,
  pinterestPanelWidth, setPinterestPanelWidth,
  loadAdminUsers, loadRoleToolDefaults,
  loadAllContentPlans,
  signOut,
  toast,
}) {
  const { can } = useApp();

  return (
    <div style={{ minHeight: "100vh", background: C.canvas, fontFamily: SANS }}>

      {/* ── Nav ── */}
      <nav style={{ background: C.canvas, borderBottom: `1px solid ${C.border}`, padding: "0 32px", display: "flex", alignItems: "stretch", height: 56, position: "sticky", top: 0, zIndex: 100 }}>
        <div onClick={() => setActivePortal(null)} style={{ cursor: "pointer", display: "flex", alignItems: "center", paddingRight: 32, borderRight: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ fontFamily: DISP, fontSize: 22, letterSpacing: 1, lineHeight: 1, color: C.accent }}>LOUDMOUTH HQ</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingLeft: 24, borderLeft: `1px solid ${C.border}` }}>
          {activePortal && activePortal !== "content-plan" && (
            <button onClick={() => setActivePortal(null)}
              style={{ background: "none", border: "none", color: C.meta, fontSize: 11, cursor: "pointer", fontFamily: MONO, letterSpacing: "1.2px", textTransform: "uppercase", fontWeight: 600, padding: 0 }}>
              ← Home
            </button>
          )}
          <NavProfileMenu
            profileName={profileName}
            currentCalendarId={null}
            onMyCalendars={() => setActivePortal(null)}
            onHistory={() => {}}
            onEditProfile={() => { setProfileInput(profileName); setEditingProfile(true); }}
            onSignOut={signOut}
          />
        </div>
      </nav>

      {/* ── Export overlay ── */}
      {exporting && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <circle cx="24" cy="24" r="20" fill="none" stroke={C.accent} strokeWidth="4"
              strokeDasharray="125.6"
              strokeDashoffset={exportProgress.total > 0 ? 125.6 * (1 - exportProgress.current / exportProgress.total) : 100}
              strokeLinecap="round"
              style={{ transformOrigin: "center", transform: "rotate(-90deg)", transition: "stroke-dashoffset 0.4s ease" }}
            />
          </svg>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 14, letterSpacing: "0.06em", marginBottom: 6, fontFamily: MONO, textTransform: "uppercase" }}>
              {exportProgress.total > 1
                ? `Rendering page ${exportProgress.current} of ${exportProgress.total}...`
                : exportElapsed < 5 ? "Building your PDF..."
                : exportElapsed < 15 ? `Rendering your calendar... (${exportElapsed}s)`
                : `Almost there... (${exportElapsed}s)`}
            </div>
            <div style={{ color: C.meta, fontSize: 12, fontFamily: SANS }}>
              {exportElapsed < 8 ? "This may take a few seconds" : "Hang tight — loading all images"}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit profile modal ── */}
      {editingProfile && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => e.target === e.currentTarget && setEditingProfile(false)}>
          <div style={{ background: C.surface, borderRadius: 20, width: 360, padding: 28, border: `1px solid ${C.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 4, fontFamily: SANS }}>Edit Profile</div>
            <div style={{ fontSize: 12, color: C.meta, marginBottom: 18, fontFamily: SANS }}>This name appears in calendar footers and your account.</div>
            <input autoFocus value={profileInput} onChange={e => setProfileInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveProfile()} placeholder="Your name..."
              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16, background: C.canvas, color: C.text, fontFamily: SANS }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveProfile} style={{ flex: 1, padding: "10px 0", background: C.accent, color: "#000", border: "none", borderRadius: 24, fontWeight: 700, fontSize: 11, cursor: "pointer", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: MONO }}>Save</button>
              <button onClick={() => setEditingProfile(false)} style={{ padding: "10px 16px", background: "transparent", color: C.meta, border: `1px solid ${C.border}`, borderRadius: 24, fontSize: 11, cursor: "pointer", fontFamily: MONO, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hub ── */}
      {activePortal === null && (
        <DashboardHub
          setActivePortal={setActivePortal}
          profileName={profileName}
          allCalendars={allCalendars}
          allContentPlans={allContentPlans}
          scheduledPosts={scheduledPosts}
          newCalendar={newCalendar}
          can={can}
          loadAllContentPlans={loadAllContentPlans}
          loadAdminUsers={loadAdminUsers}
          loadRoleToolDefaults={loadRoleToolDefaults}
          adminUsers={adminUsers}
          roleToolDefaults={roleToolDefaults}
        />
      )}

      {activePortal === "calendar" && (
        <CalendarListPortal
          allCalendars={allCalendars} calCollaborators={calCollaborators}
          schedulingCalId={schedulingCalId} openCalendar={openCalendar}
          newCalendar={newCalendar} deleteCalendar={deleteCalendar} addToSchedule={addToSchedule}
          setShareModal={setShareModal} setShareEmail={setShareEmail} setShareError={setShareError}
          setActivePortal={setActivePortal}
          scheduledPosts={scheduledPosts}
        />
      )}

      {activePortal === "scheduling" && (
        <SchedulingPortal
          scheduledPosts={scheduledPosts}
          removeScheduledPost={removeScheduledPost}
          toggleNotify={toggleNotify}
          setActivePortal={setActivePortal}
        />
      )}

      {activePortal === "admin" && can("admin_portal") && (
        <AdminPortal
          adminUsers={adminUsers} adminLoading={adminLoading}
          roleToolDefaults={roleToolDefaults} rolePermsBusy={rolePermsBusy} saveRoleToolDefaults={saveRoleToolDefaults}
          inviteModal={inviteModal} setInviteModal={setInviteModal}
          inviteForm={inviteForm} setInviteForm={setInviteForm}
          inviteBusy={inviteBusy} inviteError={inviteError} setInviteError={setInviteError}
          doInviteUser={doInviteUser}
          editingUser={editingUser} setEditingUser={setEditingUser}
          editUserForm={editUserForm} setEditUserForm={setEditUserForm}
          editUserBusy={editUserBusy}
          doUpdateUser={doUpdateUser}
          doDeleteUser={doDeleteUser} deleteUserBusy={deleteUserBusy} currentUserId={currentUserId}
          setActivePortal={setActivePortal}
        />
      )}

      {activePortal === "content-plan" && can("content_plan_creator") && (
        <ContentPlanPortal
          currentCPId={currentCPId} setCurrentCPId={setCurrentCPId}
          activeCPStep={activeCPStep} setActiveCPStep={setActiveCPStep}
          cpClientName={cpClientName} setCpClientName={setCpClientName}
          cpMonth={cpMonth} setCpMonth={setCpMonth}
          cpYear={cpYear} setCpYear={setCpYear}
          cpShootDate={cpShootDate} setCpShootDate={setCpShootDate}
          cpProducedCount={cpProducedCount} setCpProducedCount={setCpProducedCount}
          cpOrganicCount={cpOrganicCount} setCpOrganicCount={setCpOrganicCount}
          cpItems={cpItems} setCpItems={setCpItems}
          cpSaving={cpSaving}
          allContentPlans={allContentPlans}
          clients={clients} setClients={setClients}
          addingClient={addingClient} setAddingClient={setAddingClient}
          newClientInput={newClientInput} setNewClientInput={setNewClientInput}
          newContentPlan={newContentPlan} openContentPlan={openContentPlan}
          saveContentPlan={saveContentPlan} deleteContentPlan={deleteContentPlan}
          generateCPItems={generateCPItems} updateCPItem={updateCPItem}
          getOrCreateShareToken={getOrCreateShareToken}
          cpClientId={cpClientId} setCpClientId={setCpClientId}
          cpShareModal={cpShareModal} setCpShareModal={setCpShareModal}
          cpShareEmail={cpShareEmail} setCpShareEmail={setCpShareEmail}
          cpShareMethod={cpShareMethod} setCpShareMethod={setCpShareMethod}
          cpShareBusy={cpShareBusy} setCpShareBusy={setCpShareBusy}
          cpShareError={cpShareError} setCpShareError={setCpShareError}
          cpShareSuccess={cpShareSuccess} setCpShareSuccess={setCpShareSuccess}
          doSendContentPlan={doSendContentPlan}
          cpReferenceImages={cpReferenceImages}
          addCPReferenceImages={addCPReferenceImages}
          removeCPReferenceImage={removeCPReferenceImage}
          pinterestToken={pinterestToken} setPinterestToken={setPinterestToken}
          pinterestOpen={pinterestOpen} setPinterestOpen={setPinterestOpen}
          pinterestPanelWidth={pinterestPanelWidth} setPinterestPanelWidth={setPinterestPanelWidth}
          setActivePortal={setActivePortal}
        />
      )}

      {activePortal === "billing" && can("billing") && (
        <BillingPortal setActivePortal={setActivePortal} />
      )}

      {/* ── Share modal ── */}
      {shareModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => e.target === e.currentTarget && setShareModal(null)}>
          <div style={{ background: C.surface, borderRadius: 20, width: 420, padding: 28, border: `1px solid ${C.border}`, maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 4, fontFamily: SANS }}>Share Calendar</div>
            <div style={{ fontSize: 11, color: C.meta, marginBottom: 20, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "1px" }}>
              {shareModal.cal.client_name} — {MONTHS[shareModal.cal.month]} {shareModal.cal.year}
            </div>
            {(calCollaborators[shareModal.cal.id] || []).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.meta, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10, fontFamily: MONO }}>Shared with</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(calCollaborators[shareModal.cal.id] || []).map(c => (
                    <div key={c.user_id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.canvas, borderRadius: 12, padding: "8px 12px", border: `1px solid ${C.border}` }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.accent, color: "#000", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: MONO }}>{(c.name || "?")[0].toUpperCase()}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: SANS }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: C.meta, fontFamily: SANS }}>{c.email}</div>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: c.permission === "editor" ? C.accent : C.meta, background: c.permission === "editor" ? "rgba(204,255,0,0.12)" : C.surface2, borderRadius: 20, padding: "2px 8px", fontFamily: MONO }}>{c.permission}</span>
                      <button onClick={() => removeCollaborator(shareModal.cal.id, c.user_id)} style={{ background: "none", border: "none", color: C.meta, fontSize: 16, cursor: "pointer", padding: "0 4px" }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ fontSize: 10, fontWeight: 700, color: C.meta, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10, fontFamily: MONO }}>Add collaborator</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={shareEmail} onChange={e => setShareEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addCollaborator(shareModal.cal)} placeholder="colleague@example.com"
                style={{ flex: 1, padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13, outline: "none", background: C.canvas, color: C.text, fontFamily: SANS }} />
              <select value={sharePermission} onChange={e => setSharePermission(e.target.value)}
                style={{ padding: "9px 10px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12, outline: "none", background: C.canvas, color: C.text, fontFamily: SANS }}>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            {shareError && <div style={{ fontSize: 12, color: "#ff4444", marginBottom: 10, fontFamily: SANS }}>{shareError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => addCollaborator(shareModal.cal)} disabled={shareBusy || !shareEmail.trim()}
                style={{ flex: 1, padding: "10px 0", background: C.accent, color: "#000", border: "none", borderRadius: 24, fontWeight: 700, fontSize: 11, cursor: shareBusy || !shareEmail.trim() ? "default" : "pointer", opacity: shareEmail.trim() ? 1 : 0.4, letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: MONO }}>
                {shareBusy ? "Adding..." : "Add"}
              </button>
              <button onClick={() => { setShareModal(null); setShareEmail(""); setShareError(""); }}
                style={{ padding: "10px 16px", background: "transparent", color: C.meta, border: `1px solid ${C.border}`, borderRadius: 24, fontSize: 11, cursor: "pointer", fontFamily: MONO, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
