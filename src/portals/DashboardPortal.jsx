import { MONTHS } from "../constants";
import { useApp } from "../AppContext";
import Toast from "../components/Toast";
import NavProfileMenu from "../components/NavProfileMenu";
import CalendarListPortal from "./CalendarListPortal";
import SchedulingPortal from "./SchedulingPortal";
import AdminPortal from "./AdminPortal";
import ContentPlanPortal from "./ContentPlanPortal";
import BillingPortal from "./BillingPortal";

const MONO = "'Space Mono', monospace";
const SANS = "'Space Grotesk', sans-serif";

/* Design tokens */
const C = {
  canvas:   "#131313",
  surface:  "#1e1e1e",
  surface2: "#2d2d2d",
  accent:   "#CCFF00",
  text:     "#ffffff",
  muted:    "#949494",
  border:   "rgba(255,255,255,0.12)",
};

function portalCard(onClick, icon, title, desc, badge, ctaLabel, onMouseEnter, onMouseLeave) {
  return (
    <div onClick={onClick}
      className="cal-card"
      style={{ background: C.surface, borderRadius: 20, padding: "28px 24px 24px", width: 280, border: `1px solid ${C.border}`, cursor: "pointer", display: "flex", flexDirection: "column", gap: 0 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: C.canvas, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
        {icon}
      </div>
      <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 6, display: "flex", alignItems: "center", gap: 8, fontFamily: SANS }}>
        {title}
        {badge != null && badge > 0 && (
          <span style={{ background: C.accent, color: "#000", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700, fontFamily: MONO, letterSpacing: "1px" }}>{badge}</span>
        )}
      </div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, flex: 1, fontFamily: SANS }}>{desc}</div>
      <div style={{ marginTop: 20 }}>
        <span style={{ background: C.accent, color: "#000", borderRadius: 24, padding: "8px 18px", fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: MONO }}>{ctaLabel} →</span>
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

      {/* ── Top nav ── */}
      <div style={{ background: C.canvas, borderBottom: `1px solid ${C.border}`, padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1, alignItems: "flex-start" }}>
          <div style={{ color: C.accent, fontWeight: 900, fontSize: 18, letterSpacing: "0.12em", fontFamily: "'Bebas Neue', Impact, sans-serif", whiteSpace: "nowrap" }}>LOUDMOUTH HQ</div>
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 9, letterSpacing: "0.12em", fontFamily: MONO, whiteSpace: "nowrap", textTransform: "uppercase" }}>by Loudmouth</div>
        </div>
        {activePortal && activePortal !== "content-plan" && (
          <button onClick={() => setActivePortal(null)} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", fontWeight: 600, padding: 0, fontFamily: MONO, letterSpacing: "1px", textTransform: "uppercase" }}>← Home</button>
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

      {/* ── Export progress overlay ── */}
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
            <div style={{ color: C.muted, fontSize: 12, fontFamily: SANS }}>
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
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 18, fontFamily: SANS }}>This name appears in calendar footers and your account.</div>
            <input autoFocus value={profileInput} onChange={e => setProfileInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveProfile()} placeholder="Your name..."
              style={{ width: "100%", padding: "10px 14px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16, background: "#131313", color: C.text, fontFamily: SANS }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveProfile} style={{ flex: 1, padding: "10px 0", background: C.accent, color: "#000", border: "none", borderRadius: 24, fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: MONO }}>Save</button>
              <button onClick={() => setEditingProfile(false)} style={{ padding: "10px 16px", background: C.surface2, color: C.text, border: "none", borderRadius: 24, fontSize: 13, cursor: "pointer", fontFamily: SANS }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hub: portal selector ── */}
      {activePortal === null && (
        <div style={{ padding: "56px 48px 80px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "1.8px", marginBottom: 10, fontFamily: MONO }}>
              Welcome back{profileName ? `, ${profileName.split(" ")[0]}` : ""}
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: C.text, letterSpacing: "-0.5px", fontFamily: "'Bebas Neue', Impact, sans-serif", lineHeight: 1 }}>
              SELECT A PORTAL
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {can("calendar_creator") && portalCard(
              () => setActivePortal("calendar"),
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="17" rx="2" stroke={C.accent} strokeWidth="2"/>
                <path d="M3 9h18" stroke={C.accent} strokeWidth="2"/>
                <path d="M8 2v4M16 2v4" stroke={C.accent} strokeWidth="2" strokeLinecap="round"/>
                <rect x="7" y="13" width="3" height="3" rx="0.5" fill={C.accent}/>
                <rect x="11" y="13" width="3" height="3" rx="0.5" fill={C.accent}/>
              </svg>,
              "Calendar Creator",
              "Build social media content calendars and export them to PDF for your clients.",
              null,
              `${allCalendars.length} calendar${allCalendars.length !== 1 ? "s" : ""}  ·  Open`,
              e => { e.currentTarget.style.borderColor = C.accent; },
              e => { e.currentTarget.style.borderColor = C.border; }
            )}
            {can("content_scheduling") && (() => {
              const upcomingCount = scheduledPosts.filter(r => r.post_date >= new Date().toISOString().slice(0, 10)).length;
              return portalCard(
                () => setActivePortal("scheduling"),
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke={C.accent} strokeWidth="2"/>
                  <path d="M12 7v5l3 3" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>,
                "Content Scheduling",
                "Schedule posting dates and receive daily email reminders for each client.",
                upcomingCount,
                `${upcomingCount} upcoming  ·  Open`,
                e => { e.currentTarget.style.borderColor = C.accent; },
                e => { e.currentTarget.style.borderColor = C.border; }
              );
            })()}
            {can("content_plan_creator") && portalCard(
              () => { setActivePortal("content-plan"); loadAllContentPlans(); },
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="3" width="16" height="18" rx="2" stroke={C.accent} strokeWidth="2"/>
                <path d="M8 8h8M8 12h8M8 16h5" stroke={C.accent} strokeWidth="2" strokeLinecap="round"/>
                <circle cx="19" cy="19" r="4" fill={C.canvas} stroke={C.accent} strokeWidth="1.5"/>
                <path d="M17.5 19l1 1 2-2" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>,
              "Content Plan Creator",
              "Build shoot-ready content plans and share them with clients for approval.",
              null,
              `${allContentPlans.length} plan${allContentPlans.length !== 1 ? "s" : ""}  ·  Open`,
              e => { e.currentTarget.style.borderColor = C.accent; },
              e => { e.currentTarget.style.borderColor = C.border; }
            )}
            {can("admin_portal") && portalCard(
              () => { setActivePortal("admin"); if (adminUsers.length === 0) loadAdminUsers(); if (!roleToolDefaults) loadRoleToolDefaults(); },
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="8" r="3" stroke={C.accent} strokeWidth="2"/>
                <path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke={C.accent} strokeWidth="2" strokeLinecap="round"/>
                <path d="M17 11l1.5 1.5L21 10" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="18" cy="8" r="3" stroke={C.accent} strokeWidth="2"/>
              </svg>,
              "Admin Portal",
              "Manage team members, assign roles, and control tool access for your organization.",
              null,
              "Open",
              e => { e.currentTarget.style.borderColor = C.accent; },
              e => { e.currentTarget.style.borderColor = C.border; }
            )}
            {can("billing") && portalCard(
              () => setActivePortal("billing"),
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="5" width="20" height="14" rx="2" stroke={C.accent} strokeWidth="2"/>
                <path d="M2 10h20" stroke={C.accent} strokeWidth="2"/>
                <rect x="5" y="14" width="4" height="2" rx="0.5" fill={C.accent}/>
                <rect x="11" y="14" width="6" height="2" rx="0.5" fill={C.accent}/>
              </svg>,
              "Billing",
              "Create and send branded invoices, track payments, and manage client billing.",
              null,
              "Open",
              e => { e.currentTarget.style.borderColor = C.accent; },
              e => { e.currentTarget.style.borderColor = C.border; }
            )}
          </div>
        </div>
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
          saveContentPlan={saveContentPlan} deleteContentPlan={deleteContentPlan} generateCPItems={generateCPItems} updateCPItem={updateCPItem}
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
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 20, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "1px" }}>{shareModal.cal.client_name} — {MONTHS[shareModal.cal.month]} {shareModal.cal.year}</div>
            {(calCollaborators[shareModal.cal.id] || []).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10, fontFamily: MONO }}>Shared with</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(calCollaborators[shareModal.cal.id] || []).map(c => (
                    <div key={c.user_id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#131313", borderRadius: 12, padding: "8px 12px", border: `1px solid ${C.border}` }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.accent, color: "#000", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: MONO }}>{(c.name || "?")[0].toUpperCase()}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: SANS }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: C.muted, fontFamily: SANS }}>{c.email}</div>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: c.permission === "editor" ? "#CCFF00" : C.muted, background: c.permission === "editor" ? "rgba(204,255,0,0.12)" : "#1e1e1e", borderRadius: 20, padding: "2px 8px", fontFamily: MONO }}>{c.permission}</span>
                      <button onClick={() => removeCollaborator(shareModal.cal.id, c.user_id)} style={{ background: "none", border: "none", color: C.muted, fontSize: 16, cursor: "pointer", padding: "0 4px" }} title="Remove">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10, fontFamily: MONO }}>Add collaborator</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={shareEmail} onChange={e => setShareEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addCollaborator(shareModal.cal)} placeholder="colleague@example.com"
                style={{ flex: 1, padding: "9px 12px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4, fontSize: 13, outline: "none", background: "#131313", color: C.text, fontFamily: SANS }} />
              <select value={sharePermission} onChange={e => setSharePermission(e.target.value)}
                style={{ padding: "9px 10px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4, fontSize: 12, outline: "none", background: "#131313", color: C.text, fontFamily: SANS }}>
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
                style={{ padding: "10px 16px", background: C.surface2, color: C.text, border: "none", borderRadius: 24, fontSize: 13, cursor: "pointer", fontFamily: SANS }}>Done</button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
