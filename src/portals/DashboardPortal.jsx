import { useState } from "react";
import { MONTHS } from "../constants";
import { useApp } from "../AppContext";
import { Toaster } from "../components/ui/sonner";
import NavProfileMenu from "../components/NavProfileMenu";
import CollabAvatars from "../components/CollabAvatars";
import CalendarListPortal from "./CalendarListPortal";
import SchedulingPortal from "./SchedulingPortal";
import AdminPortal from "./AdminPortal";
import ContentPlanPortal from "./ContentPlanPortal";
import BillingPortal from "./BillingPortal";
import { SANS, MONO, C, DISP } from "../theme";

// ── Icons ─────────────────────────────────────────────────────────────────────
const icons = {
  calendar: (
    <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M3 9h18" stroke="currentColor" strokeWidth="2"/>
      <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  contentPlan: (
    <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  scheduling: (
    <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  admin: (
    <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M17 11l1.5 1.5L21 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="18" cy="8" r="3" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  billing: (
    <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
      <rect x="5" y="14" width="4" height="2" rx="0.5" fill="currentColor"/>
    </svg>
  ),
  home: (
    <svg aria-hidden="true" focusable="false" width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M3 12L12 3l9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 10v11h14V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 21V15h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

const NAV_ITEMS = [
  { key: "calendar",     permission: "calendar_creator",     label: "Calendar Creator",    icon: icons.calendar },
  { key: "content-plan", permission: "content_plan_creator", label: "Content Plans",       icon: icons.contentPlan },
  { key: "scheduling",   permission: "content_scheduling",   label: "Scheduling",          icon: icons.scheduling },
  { key: "admin",        permission: "admin_portal",         label: "Admin",               icon: icons.admin },
  { key: "billing",      permission: "billing",              label: "Billing",             icon: icons.billing },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ activePortal, setActivePortal, profileName, scheduledPosts, can, signOut, setProfileInput, setEditingProfile, loadAllContentPlans, loadAdminUsers, loadRoleToolDefaults, adminUsers, roleToolDefaults }) {
  const { user } = useApp();
  const today = new Date();
  const upcomingCount = scheduledPosts.filter(r => r.post_date >= today.toISOString().slice(0, 10)).length;

  function navigate(key, permission) {
    if (permission === "content_plan_creator") loadAllContentPlans();
    if (permission === "admin_portal") {
      if (adminUsers.length === 0) loadAdminUsers();
      if (!roleToolDefaults) loadRoleToolDefaults();
    }
    setActivePortal(key);
  }

  return (
    <div style={{ width: 220, flexShrink: 0, height: "100vh", background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0 }}>
      {/* Profile */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "10px 10px", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <NavProfileMenu
            profileName={profileName}
            userEmail={user?.email}
            currentCalendarId={null}
            onMyCalendars={() => setActivePortal(null)}
            onHistory={() => {}}
            onEditProfile={() => { setProfileInput(profileName); setEditingProfile(true); }}
            onSignOut={signOut}
          />
        </div>
        <button
          onClick={() => setActivePortal(null)}
          title="Home"
          style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 7, width: 32, alignSelf: "stretch", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, color: "#949494", transition: "background 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
        >
          {icons.home}
        </button>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "10px 0", overflowY: "auto" }}>
        {NAV_ITEMS.filter(item => can(item.permission)).map(item => {
          const isActive = activePortal === item.key;
          const badge = item.key === "scheduling" && upcomingCount > 0 ? upcomingCount : null;
          return (
            <div key={item.key} onClick={() => navigate(item.key, item.permission)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
                cursor: "pointer", transition: "background 0.12s",
                background: isActive ? "rgba(204,255,0,0.08)" : "transparent",
                borderLeft: isActive ? `2px solid ${C.accent}` : "2px solid transparent",
                color: isActive ? C.accent : C.meta,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: isActive ? 600 : 400, flex: 1 }}>{item.label}</span>
              {badge && (
                <span style={{ background: C.accent, color: "#000", borderRadius: 20, padding: "2px 7px", fontSize: 9, fontWeight: 700, fontFamily: MONO }}>
                  {badge}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logo */}
      <div onClick={() => setActivePortal(null)} style={{ padding: "16px 20px 20px", borderTop: `1px solid ${C.border}`, cursor: "pointer" }}>
        <div style={{ fontFamily: DISP, fontSize: 20, letterSpacing: 1, color: C.accent, lineHeight: 1 }}>LOUDMOUTH HQ</div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: C.meta, textTransform: "uppercase", letterSpacing: "1.5px", marginTop: -2 }}>
          {today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </div>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ label, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.8px", color: C.meta, whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      {action}
    </div>
  );
}

// ── Hub ───────────────────────────────────────────────────────────────────────
function Hub({ setActivePortal, profileName, allCalendars, calCollaborators, allContentPlans, scheduledPosts, newCalendar, openCalendar, can, loadAllContentPlans }) {
  const today = new Date();
  const { user } = useApp();
  const firstName = profileName ? profileName.split(" ")[0] : null;

  const DAY_GREETINGS = [
    ["YOU OPENED THE APP",  "ON A SUNDAY. BOLD."],       // Sun
    ["THE ALGORITHM",       "ALSO HATES MONDAYS."],      // Mon
    ["WE BOTH KNOW",        "THIS ISN'T URGENT."],       // Tue
    ["HALFWAY THERE.",      "WE'RE NOT SURE WHERE."],    // Wed
    ["ALMOST FRIDAY.",      "DON'T BLOW IT NOW."],       // Thu
    ["IT'S FRIDAY.",        "THIS APP IS JUDGING YOU."], // Fri
    ["RESPECTFULLY,",       "GO TOUCH GRASS."],          // Sat
  ];
  const [line1, line2] = DAY_GREETINGS[today.getDay()];

  const recentCals = [...allCalendars]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  const recentPlans = [...allContentPlans]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  const upcomingPosts = scheduledPosts
    .filter(r => r.post_date >= today.toISOString().slice(0, 10))
    .sort((a, b) => a.post_date.localeCompare(b.post_date))
    .slice(0, 5);

  const statusColor = { approved: "#CCFF00", pending: C.meta, denied: "#ff4444" };

  return (
    <div style={{ padding: "40px 48px 80px" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: DISP, fontSize: 72, lineHeight: 1, letterSpacing: 1, color: C.text }}>
          {line1}<br />
          <span style={{ color: C.accent }}>{line2}</span>
        </div>
        {firstName && (
          <div style={{ marginTop: 12, fontFamily: SANS, fontWeight: 300, fontSize: 15, color: C.meta, letterSpacing: 0.5 }}>
            What's good, {firstName}.
          </div>
        )}
      </div>

      {/* Recently Edited Calendars */}
      <div style={{ marginBottom: 40 }}>
        <SectionHeader label="Recently Edited Calendars" />
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
          {recentCals.map(cal => (
            <div key={cal.id} onClick={() => openCalendar(cal)}
              style={{ width: 200, flexShrink: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: C.accent, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5, color: "#000", lineHeight: 1.2 }}>{MONTHS[cal.month].slice(0, 3)}</span>
                  <span style={{ fontFamily: MONO, fontSize: 7, color: "#000", lineHeight: 1.2 }}>{cal.year}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: SANS }}>{cal.client_name}</div>
                    {cal.user_id !== user?.id && (
                      <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", background: "rgba(68,102,204,0.15)", color: "#7799ff", borderRadius: 4, padding: "2px 5px", flexShrink: 0 }}>SHARED</span>
                    )}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: C.meta, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>
                    {MONTHS[cal.month].slice(0, 3)} {cal.year}
                  </div>
                </div>
              </div>
              <CollabAvatars collaborators={calCollaborators?.[cal.id]} />
              <div style={{ fontFamily: MONO, fontSize: 9, color: C.meta, letterSpacing: 0.5 }}>
                {cal.updated_at ? `Saved ${new Date(cal.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "—"}
                {cal.last_updated_by ? ` · ${cal.last_updated_by}` : ""}
              </div>
            </div>
          ))}
          {/* Dashed "New Calendar" card */}
          <div onClick={newCalendar}
            style={{ width: 200, flexShrink: 0, border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", minHeight: 68, transition: "all 0.15s", color: C.meta }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = C.meta; }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px" }}>New Calendar</span>
          </div>
        </div>
      </div>

      {/* Recent Content Plans */}
      {can("content_plan_creator") && (
        <div style={{ marginBottom: 40 }}>
          <SectionHeader label="Recent Content Plans" />
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {recentPlans.map(plan => {
              const planStatus = plan.items
                ? (plan.items.every(i => i.approval_status === "approved") ? "approved" : "pending")
                : "pending";
              return (
                <div key={plan.id} onClick={() => { loadAllContentPlans(); setActivePortal("content-plan"); }}
                  style={{ width: 200, flexShrink: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.text, fontFamily: SANS, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {plan.client_name || plan.clients?.name || "Untitled"}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: C.meta, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    {plan.month != null ? `${MONTHS[plan.month].slice(0, 3)} ${plan.year}` : "—"}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 4 }}>
                    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: statusColor[planStatus] ?? C.meta, background: planStatus === "approved" ? "rgba(204,255,0,0.1)" : "rgba(255,255,255,0.05)", borderRadius: 20, padding: "2px 8px" }}>
                      {planStatus}
                    </span>
                    {plan.shoot_date && (
                      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", borderRadius: 20, padding: "2px 8px", color: plan.shoot_date === "PENDING" ? "#ff6b6b" : "#7fd99e", background: plan.shoot_date === "PENDING" ? "rgba(255,68,68,0.12)" : "rgba(34,170,102,0.12)" }}>
                        {plan.shoot_date === "PENDING" ? "SHOOT PENDING" : `SHOOT: ${plan.shoot_date}`}
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: C.meta, letterSpacing: 0.5 }}>
                    {plan.updated_at ? `Saved ${new Date(plan.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "—"}
                    {plan.last_updated_by ? ` · ${plan.last_updated_by}` : ""}
                  </div>
                </div>
              );
            })}
            {/* Dashed "New Plan" card */}
            <div onClick={() => { loadAllContentPlans(); setActivePortal("content-plan"); }}
              style={{ width: 200, flexShrink: 0, border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", minHeight: 90, transition: "all 0.15s", color: C.meta }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = C.meta; }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px" }}>New Plan</span>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Scheduled Posts */}
      {can("content_scheduling") && (
        <div>
          <SectionHeader
            label="Upcoming Scheduled Posts"
            action={
              <button onClick={() => setActivePortal("scheduling")}
                style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 20, padding: "5px 14px", fontFamily: MONO, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: C.meta, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.meta; }}>
                View all
              </button>
            }
          />
          {upcomingPosts.length === 0 ? (
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.meta, textTransform: "uppercase", letterSpacing: "1.5px", padding: "24px 0" }}>No upcoming posts</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {upcomingPosts.map(post => (
                <div key={post.id} onClick={() => setActivePortal("scheduling")}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                  <div style={{ flexShrink: 0, textAlign: "center", minWidth: 44 }}>
                    <div style={{ fontFamily: DISP, fontSize: 22, color: C.accent, lineHeight: 1 }}>
                      {new Date(post.post_date + "T12:00:00").getDate()}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 8, color: C.meta, textTransform: "uppercase", letterSpacing: 1 }}>
                      {new Date(post.post_date + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}
                    </div>
                  </div>
                  <div style={{ width: 1, height: 32, background: C.border, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: C.text, fontFamily: SANS }}>{post.client_name}</div>
                    {post.content_types?.length > 0 && (
                      <div style={{ fontFamily: MONO, fontSize: 9, color: C.meta, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>
                        {post.content_types.join(" · ")}
                      </div>
                    )}
                  </div>
                  {post.notify && (
                    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.accent, background: "rgba(204,255,0,0.1)", borderRadius: 20, padding: "2px 8px", flexShrink: 0 }}>Notify</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
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
}) {
  const { can } = useApp();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: C.canvas, fontFamily: SANS }}>

      {/* ── Sidebar ── */}
      <Sidebar
        activePortal={activePortal}
        setActivePortal={setActivePortal}
        profileName={profileName}
        scheduledPosts={scheduledPosts}
        can={can}
        signOut={signOut}
        setProfileInput={setProfileInput}
        setEditingProfile={setEditingProfile}
        loadAllContentPlans={loadAllContentPlans}
        loadAdminUsers={loadAdminUsers}
        loadRoleToolDefaults={loadRoleToolDefaults}
        adminUsers={adminUsers}
        roleToolDefaults={roleToolDefaults}
      />

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflowY: "auto", background: C.canvas }}>

        {activePortal === null && (
          <Hub
            setActivePortal={setActivePortal}
            profileName={profileName}
            allCalendars={allCalendars}
            calCollaborators={calCollaborators}
            allContentPlans={allContentPlans}
            scheduledPosts={scheduledPosts}
            newCalendar={newCalendar}
            openCalendar={openCalendar}
            can={can}
            loadAllContentPlans={loadAllContentPlans}
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
            allCalendars={allCalendars}
            openCalendar={openCalendar}
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
      </main>

      {/* ── Export overlay ── */}
      {exporting && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
          <svg aria-hidden="true" focusable="false" width="48" height="48" viewBox="0 0 48 48">
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
          <div style={{ background: C.surface, borderRadius: 16, width: 360, padding: 28, border: `1px solid ${C.border}` }}>
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

      {/* ── Share modal ── */}
      {shareModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => e.target === e.currentTarget && setShareModal(null)}>
          <div style={{ background: C.surface, borderRadius: 16, width: 420, padding: 28, border: `1px solid ${C.border}`, maxHeight: "80vh", overflowY: "auto" }}>
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

      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  );
}
