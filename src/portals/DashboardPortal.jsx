import { MONTHS } from "../constants";
import { useApp } from "../AppContext";
import Toast from "../components/Toast";
import NavProfileMenu from "../components/NavProfileMenu";
import CalendarListPortal from "./CalendarListPortal";
import SchedulingPortal from "./SchedulingPortal";
import AdminPortal from "./AdminPortal";
import ContentPlanPortal from "./ContentPlanPortal";

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
  inviteModal, setInviteModal, inviteForm, setInviteForm,
  inviteBusy, inviteError, setInviteError, doInviteUser,
  editingUser, setEditingUser, editUserForm, setEditUserForm,
  editUserBusy, doUpdateUser,
  currentCPId, setCurrentCPId, activeCPStep, setActiveCPStep,
  cpClientName, setCpClientName, cpMonth, setCpMonth, cpYear, setCpYear,
  cpShootDate, setCpShootDate, cpProducedCount, setCpProducedCount,
  cpOrganicCount, setCpOrganicCount, cpItems, setCpItems, cpSaving,
  allContentPlans, clients, setClients, addingClient, setAddingClient,
  newClientInput, setNewClientInput,
  newContentPlan, openContentPlan, saveContentPlan, deleteContentPlan, generateCPItems, updateCPItem,
  getOrCreateShareToken,
  cpShareModal, setCpShareModal, cpShareEmail, setCpShareEmail,
  cpShareBusy, setCpShareBusy, cpShareError, setCpShareError,
  loadAdminUsers,
  loadAllContentPlans,
  signOut,
  toast,
}) {
  const { can } = useApp();

  return (
<div style={{ minHeight: "100vh", background: "#f4f4f0", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
  <div style={{ background: "#1a1a2e", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, alignItems: "flex-start" }}>
      <div style={{ color: "#D7FA06", fontWeight: 900, fontSize: 16, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>LOUDMOUTH HQ</div>
      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>by Loudmouth</div>
    </div>
    {activePortal && (
      <button onClick={() => setActivePortal(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", fontWeight: 600, padding: 0 }}>← Home</button>
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
  {exporting && (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(15,15,25,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, backdropFilter: "blur(4px)" }}>
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
        <circle cx="24" cy="24" r="20" fill="none" stroke="#D7FA06" strokeWidth="4"
          strokeDasharray="125.6"
          strokeDashoffset={exportProgress.total > 0 ? 125.6 * (1 - exportProgress.current / exportProgress.total) : 100}
          strokeLinecap="round"
          style={{ transformOrigin: "center", transform: "rotate(-90deg)", transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div style={{ textAlign: "center" }}>
      <div style={{ color: "white", fontWeight: 700, fontSize: 15, letterSpacing: "0.04em", marginBottom: 6 }}>
          {exportProgress.total > 1
            ? `Rendering page ${exportProgress.current} of ${exportProgress.total}...`
            : exportElapsed < 5
            ? "Building your PDF..."
            : exportElapsed < 15
            ? `Rendering your calendar... (${exportElapsed}s)`
            : `Almost there... (${exportElapsed}s)`}
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
          {exportElapsed < 8 ? "This may take a few seconds" : "Hang tight — loading all images"}
        </div>
      </div>
    </div>
  )}
  {editingProfile && (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && setEditingProfile(false)}>
      <div style={{ background: "white", borderRadius: 14, width: 360, padding: 28, boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>Edit Profile</div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 18 }}>This name appears in calendar footers and your account.</div>
        <input autoFocus value={profileInput} onChange={e => setProfileInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveProfile()} placeholder="Your name..." style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={saveProfile} style={{ flex: 1, padding: "10px 0", background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Save</button>
          <button onClick={() => setEditingProfile(false)} style={{ padding: "10px 16px", background: "#f0f0f0", color: "#555", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  )}

  {/* ── Hub: portal selector ── */}
  {activePortal === null && (
    <div style={{ padding: "60px 60px 80px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#1a1a2e", letterSpacing: "-0.01em", marginBottom: 6 }}>
          Welcome back{profileName ? `, ${profileName.split(" ")[0]}` : ""}.
        </div>
        <div style={{ fontSize: 14, color: "#999" }}>Select a portal to get started.</div>
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {/* Calendar Creator */}
        {can("calendar_creator") && (
          <div onClick={() => setActivePortal("calendar")} style={{ background: "white", borderRadius: 16, padding: "32px 28px 28px", width: 300, boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: "1.5px solid #e8e8e8", cursor: "pointer", display: "flex", flexDirection: "column", gap: 0, transition: "box-shadow 0.15s, transform 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.13)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.07)"; e.currentTarget.style.transform = "none"; }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="17" rx="2" stroke="#D7FA06" strokeWidth="2"/>
                <path d="M3 9h18" stroke="#D7FA06" strokeWidth="2"/>
                <path d="M8 2v4M16 2v4" stroke="#D7FA06" strokeWidth="2" strokeLinecap="round"/>
                <rect x="7" y="13" width="3" height="3" rx="0.5" fill="#D7FA06"/>
                <rect x="11" y="13" width="3" height="3" rx="0.5" fill="#D7FA06"/>
              </svg>
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#1a1a2e", marginBottom: 8 }}>Calendar Creator</div>
            <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5, flex: 1 }}>Build social media content calendars and export them to PDF for your clients.</div>
            <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#bbb" }}>{allCalendars.length} calendar{allCalendars.length !== 1 ? "s" : ""}</span>
              <span style={{ background: "#1a1a2e", color: "#D7FA06", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 800, letterSpacing: "0.04em" }}>Open →</span>
            </div>
          </div>
        )}
        {/* Content Scheduling */}
        {can("content_scheduling") && (() => {
          const upcomingCount = scheduledPosts.filter(r => r.post_date >= new Date().toISOString().slice(0, 10)).length;
          return (
            <div onClick={() => setActivePortal("scheduling")} style={{ background: "white", borderRadius: 16, padding: "32px 28px 28px", width: 300, boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: "1.5px solid #e8e8e8", cursor: "pointer", display: "flex", flexDirection: "column", gap: 0, transition: "box-shadow 0.15s, transform 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.13)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.07)"; e.currentTarget.style.transform = "none"; }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#D7FA06" strokeWidth="2"/>
                  <path d="M12 7v5l3 3" stroke="#D7FA06" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#1a1a2e", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                Content Scheduling
                {upcomingCount > 0 && <span style={{ background: "#D7FA06", color: "#1a1a2e", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 800 }}>{upcomingCount}</span>}
              </div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5, flex: 1 }}>Schedule posting dates and receive daily email reminders for each client.</div>
              <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#bbb" }}>{upcomingCount} upcoming</span>
                <span style={{ background: "#1a1a2e", color: "#D7FA06", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 800, letterSpacing: "0.04em" }}>Open →</span>
              </div>
            </div>
          );
        })()}
        {/* Admin Portal */}
        {can("admin_portal") && (
          <div onClick={() => { setActivePortal("admin"); if (adminUsers.length === 0) loadAdminUsers(); }} style={{ background: "white", borderRadius: 16, padding: "32px 28px 28px", width: 300, boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: "1.5px solid #e8e8e8", cursor: "pointer", display: "flex", flexDirection: "column", gap: 0, transition: "box-shadow 0.15s, transform 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.13)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.07)"; e.currentTarget.style.transform = "none"; }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="8" r="3" stroke="#D7FA06" strokeWidth="2"/>
                <path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="#D7FA06" strokeWidth="2" strokeLinecap="round"/>
                <path d="M17 11l1.5 1.5L21 10" stroke="#D7FA06" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="18" cy="8" r="3" stroke="#D7FA06" strokeWidth="2"/>
              </svg>
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#1a1a2e", marginBottom: 8 }}>Admin Portal</div>
            <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5, flex: 1 }}>Manage team members, assign roles, and control tool access for your organization.</div>
            <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#bbb" }}> </span>
              <span style={{ background: "#1a1a2e", color: "#D7FA06", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 800, letterSpacing: "0.04em" }}>Open →</span>
            </div>
          </div>
        )}
        {/* Content Plan Creator */}
        {can("content_plan_creator") && (
          <div onClick={() => { setActivePortal("content-plan"); loadAllContentPlans(); }} style={{ background: "white", borderRadius: 16, padding: "32px 28px 28px", width: 300, boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: "1.5px solid #e8e8e8", cursor: "pointer", display: "flex", flexDirection: "column", gap: 0, transition: "box-shadow 0.15s, transform 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.13)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.07)"; e.currentTarget.style.transform = "none"; }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="3" width="16" height="18" rx="2" stroke="#D7FA06" strokeWidth="2"/>
                <path d="M8 8h8M8 12h8M8 16h5" stroke="#D7FA06" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="19" cy="19" r="4" fill="#1a1a2e" stroke="#D7FA06" strokeWidth="1.5"/>
                <path d="M17.5 19l1 1 2-2" stroke="#D7FA06" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#1a1a2e", marginBottom: 8 }}>Content Plan Creator</div>
            <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5, flex: 1 }}>Build shoot-ready content plans and share them with clients for approval.</div>
            <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#bbb" }}>{allContentPlans.length} plan{allContentPlans.length !== 1 ? "s" : ""}</span>
              <span style={{ background: "#1a1a2e", color: "#D7FA06", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 800, letterSpacing: "0.04em" }}>Open →</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )}

  {/* ── Calendar Creator portal ── */}
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

  {/* ── Content Scheduling portal ── */}
  {activePortal === "scheduling" && (
    <SchedulingPortal
      scheduledPosts={scheduledPosts}
      removeScheduledPost={removeScheduledPost}
      toggleNotify={toggleNotify}
      setActivePortal={setActivePortal}
    />
  )}

  {/* ── Admin portal ── */}
  {activePortal === "admin" && can("admin_portal") && (
    <AdminPortal
      adminUsers={adminUsers} adminLoading={adminLoading}
      inviteModal={inviteModal} setInviteModal={setInviteModal}
      inviteForm={inviteForm} setInviteForm={setInviteForm}
      inviteBusy={inviteBusy} inviteError={inviteError} setInviteError={setInviteError}
      doInviteUser={doInviteUser}
      editingUser={editingUser} setEditingUser={setEditingUser}
      editUserForm={editUserForm} setEditUserForm={setEditUserForm}
      editUserBusy={editUserBusy}
      doUpdateUser={doUpdateUser}
      setActivePortal={setActivePortal}
    />
  )}

  {/* ── Content Plan Creator portal ── */}
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
      cpShareModal={cpShareModal} setCpShareModal={setCpShareModal}
      cpShareEmail={cpShareEmail} setCpShareEmail={setCpShareEmail}
      cpShareBusy={cpShareBusy} setCpShareBusy={setCpShareBusy}
      cpShareError={cpShareError} setCpShareError={setCpShareError}
      setActivePortal={setActivePortal}
    />
  )}

  {/* ── Share Modal ── */}
  {shareModal && (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && setShareModal(null)}>
      <div style={{ background: "white", borderRadius: 16, width: 420, padding: 28, boxShadow: "0 24px 60px rgba(0,0,0,0.2)", maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>Share Calendar</div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 20 }}>{shareModal.cal.client_name} — {MONTHS[shareModal.cal.month]} {shareModal.cal.year}</div>
        {/* Existing collaborators */}
        {(calCollaborators[shareModal.cal.id] || []).length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Shared with</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(calCollaborators[shareModal.cal.id] || []).map(c => (
                <div key={c.user_id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8f8f8", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#1a1a2e", color: "#D7FA06", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{(c.name || "?")[0].toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>{c.email}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: c.permission === "editor" ? "#5a7a00" : "#888", background: c.permission === "editor" ? "#f5fbda" : "#f0f0f0", borderRadius: 5, padding: "2px 7px" }}>{c.permission}</span>
                  <button onClick={() => removeCollaborator(shareModal.cal.id, c.user_id)} style={{ background: "none", border: "none", color: "#ccc", fontSize: 16, cursor: "pointer", padding: "0 4px" }} title="Remove">×</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Add new collaborator */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Add collaborator</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            value={shareEmail}
            onChange={e => setShareEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCollaborator(shareModal.cal)}
            placeholder="colleague@example.com"
            style={{ flex: 1, padding: "9px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, outline: "none" }}
          />
          <select value={sharePermission} onChange={e => setSharePermission(e.target.value)} style={{ padding: "9px 10px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 12, outline: "none", background: "white" }}>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        {shareError && <div style={{ fontSize: 12, color: "#E8001C", marginBottom: 10 }}>{shareError}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => addCollaborator(shareModal.cal)} disabled={shareBusy || !shareEmail.trim()} style={{ flex: 1, padding: "10px 0", background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: shareBusy || !shareEmail.trim() ? "default" : "pointer", opacity: shareEmail.trim() ? 1 : 0.4 }}>
            {shareBusy ? "Adding..." : "Add"}
          </button>
          <button onClick={() => { setShareModal(null); setShareEmail(""); setShareError(""); }} style={{ padding: "10px 16px", background: "#f0f0f0", color: "#555", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Done</button>
        </div>
      </div>
    </div>
  )}

  <Toast toast={toast} />
</div>
  );
}
