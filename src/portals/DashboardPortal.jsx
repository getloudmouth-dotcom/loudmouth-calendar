import { useState } from "react";
import { MONTHS } from "../constants";
import { useApp } from "../AppContext";
import { Toaster } from "../components/ui/sonner";
import NavProfileMenu from "../components/NavProfileMenu";
import CalendarListPortal from "./CalendarListPortal";
import ClientListPortal from "./ClientListPortal";
import ClientPortal from "./ClientPortal";
import MonthWorkspace from "./MonthWorkspace";
import SchedulingPortal from "./SchedulingPortal";
import AdminPortal from "./AdminPortal";
import ContentPlanPortal from "./ContentPlanPortal";
import BillingPortal from "./BillingPortal";
import GridCreatorPortal from "./GridCreatorPortal";
import { SANS, MONO, C, DISP, BADGE } from "../theme";
import Skeleton from "../components/Skeleton";

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
  grid: (
    <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
      <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  home: (
    <svg aria-hidden="true" focusable="false" width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M3 12L12 3l9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 10v11h14V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 21V15h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  settings: (
    <svg aria-hidden="true" focusable="false" width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  clients: (
    <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M2 21c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="19" cy="7" r="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M22 21c0-3-2-5-3-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
};

const TOOL_ITEMS = [
  { key: "scheduling",   permission: "content_scheduling",   label: "Scheduling",   icon: icons.scheduling },
  { key: "content-plan", permission: "content_plan_creator", label: "Content Plans",icon: icons.contentPlan },
  { key: "grid",         permission: "grid_creator",         label: "Grid Creator", icon: icons.grid },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────
export function Sidebar({ activePortal, setActivePortal, profileName, scheduledPosts, can, signOut, setProfileInput, setEditingProfile, loadAllContentPlans, loadAdminUsers, loadRoleToolDefaults, adminUsers, roleToolDefaults, onOpenRolePerms, clients, workspaceClientId, onSelectClient, addClientDirect }) {
  const { user } = useApp();
  const today = new Date();
  const upcomingCount = scheduledPosts.filter(r => r.post_date >= today.toISOString().slice(0, 10)).length;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");

  async function handleAddClient() {
    if (!newClientName.trim()) return;
    await addClientDirect(newClientName.trim());
    setNewClientName("");
    setAddingClient(false);
  }

  function navigateTool(key, permission) {
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
            isAdmin={can("admin_portal")}
            onAdminPortal={() => navigateTool("admin", "admin_portal")}
            hasBilling={can("billing")}
            onBillingPortal={() => setActivePortal("billing")}
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

      {/* Clients section header */}
      <div style={{ padding: "12px 16px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.8px", color: C.meta }}>Clients</span>
        <button
          onClick={() => { setAddingClient(a => !a); setNewClientName(""); }}
          title="Add client"
          style={{ background: "none", border: "none", color: addingClient ? C.accent : C.meta, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px", display: "flex", alignItems: "center", transition: "color 0.12s" }}
          onMouseEnter={e => e.currentTarget.style.color = C.accent}
          onMouseLeave={e => e.currentTarget.style.color = addingClient ? C.accent : C.meta}
        >+</button>
      </div>

      {/* Add client inline input */}
      {addingClient && (
        <div style={{ padding: "4px 12px 8px" }}>
          <input
            autoFocus
            aria-label="New client name"
            value={newClientName}
            onChange={e => setNewClientName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAddClient(); if (e.key === "Escape") { setAddingClient(false); setNewClientName(""); } }}
            placeholder="Client name..."
            style={{ width: "100%", padding: "7px 10px", background: C.canvas, border: `1px solid ${C.accent}`, borderRadius: 6, color: C.text, fontFamily: SANS, fontSize: 12, outline: "none", boxSizing: "border-box" }}
          />
        </div>
      )}

      {/* Client list */}
      <nav style={{ flex: 1, overflowY: "auto", paddingBottom: 6 }}>
        {clients.map(client => {
          const isActive = activePortal === "clients" && workspaceClientId === client.id;
          return (
            <button
              key={client.id}
              onClick={() => onSelectClient(client.id)}
              aria-current={isActive ? "page" : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 9, padding: "8px 16px",
                width: "100%", textAlign: "left", background: isActive ? "rgba(204,255,0,0.08)" : "transparent",
                border: "none", borderLeft: isActive ? `2px solid ${C.accent}` : "2px solid transparent",
                cursor: "pointer", transition: "background 0.12s",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ width: 26, height: 26, borderRadius: 7, background: isActive ? C.accent : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.12s" }}>
                <span style={{ fontFamily: DISP, fontSize: 12, color: isActive ? "#000" : C.meta, lineHeight: 1 }}>
                  {(client.name || "?")[0].toUpperCase()}
                </span>
              </div>
              <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? C.text : C.meta, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {client.name}
              </span>
            </button>
          );
        })}
        {clients.length === 0 && !addingClient && (
          <div style={{ padding: "16px 16px", fontFamily: MONO, fontSize: 10, color: C.meta, textTransform: "uppercase", letterSpacing: "1.2px" }}>
            No clients yet
          </div>
        )}
      </nav>

      {/* Tool icons row */}
      {TOOL_ITEMS.some(t => can(t.permission)) && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "8px 12px", display: "flex", gap: 4, justifyContent: "flex-start", flexWrap: "wrap" }}>
          {TOOL_ITEMS.filter(t => can(t.permission)).map(item => {
            const isActive = activePortal === item.key;
            const badge = item.key === "scheduling" && upcomingCount > 0 ? upcomingCount : null;
            return (
              <div key={item.key} style={{ position: "relative" }}>
                <button
                  onClick={() => navigateTool(item.key, item.permission)}
                  title={item.label}
                  style={{
                    background: isActive ? "rgba(204,255,0,0.12)" : "rgba(255,255,255,0.06)",
                    border: "none", borderRadius: 7, width: 32, height: 32,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: isActive ? C.accent : C.meta,
                    transition: "background 0.12s, color 0.12s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = C.text; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isActive ? "rgba(204,255,0,0.12)" : "rgba(255,255,255,0.06)"; e.currentTarget.style.color = isActive ? C.accent : C.meta; }}
                >
                  {item.icon}
                </button>
                {badge && (
                  <span style={{ position: "absolute", top: -4, right: -4, background: C.accent, color: "#000", borderRadius: 20, padding: "1px 5px", fontSize: 8, fontWeight: 700, fontFamily: MONO, pointerEvents: "none" }}>
                    {badge}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Logo + settings */}
      <div style={{ padding: "16px 20px 20px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        <button onClick={() => setActivePortal(null)} aria-label="Go to home dashboard" style={{ flex: 1, cursor: "pointer", minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left" }}>
          <div style={{ fontFamily: DISP, fontSize: 20, letterSpacing: 1, color: C.accent, lineHeight: 1 }}>LOUDMOUTH HQ</div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: C.meta, textTransform: "uppercase", letterSpacing: "1.5px", marginTop: -2 }}>
            {today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </button>
        <button
          onClick={() => setSettingsOpen(o => !o)}
          title="Settings"
          aria-label="Settings"
          style={{ background: settingsOpen ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)", border: "none", borderRadius: 7, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, color: settingsOpen ? C.text : "#949494", transition: "background 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
          onMouseLeave={e => e.currentTarget.style.background = settingsOpen ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)"}
        >
          {icons.settings}
        </button>

        {/* Settings popover */}
        {settingsOpen && (
          <>
            <div onClick={() => setSettingsOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 100 }} />
            <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 12, right: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "6px 0", zIndex: 101, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: C.meta, textTransform: "uppercase", letterSpacing: "1.5px", padding: "6px 14px 4px" }}>Settings</div>
              <button
                onClick={() => { window.open("/privacy-policy", "_blank"); setSettingsOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", background: "transparent", border: "none", color: C.text, fontFamily: SANS, fontSize: 13, cursor: "pointer", textAlign: "left", transition: "background 0.12s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                Privacy Policy
                <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, color: C.meta }}>↗</span>
              </button>
              {can("admin_portal") && (
                <button
                  onClick={() => {
                    if (adminUsers.length === 0) loadAdminUsers();
                    if (!roleToolDefaults) loadRoleToolDefaults();
                    onOpenRolePerms();
                    setSettingsOpen(false);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", background: "transparent", border: "none", color: C.text, fontFamily: SANS, fontSize: 13, cursor: "pointer", textAlign: "left", transition: "background 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  Role Permissions
                </button>
              )}
            </div>
          </>
        )}
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

// ── Hub skeletons ─────────────────────────────────────────────────────────────
function CalendarCardSkeleton() {
  return (
    <div style={{ width: 200, height: 110, flexShrink: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Skeleton width={36} height={36} radius={8} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <Skeleton width="80%" height={10} />
          <Skeleton width="55%" height={8} />
        </div>
      </div>
      <Skeleton width="70%" height={8} style={{ marginTop: "auto" }} />
    </div>
  );
}

function ContentPlanCardSkeleton() {
  return (
    <div style={{ width: 200, flexShrink: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8, minHeight: 110 }}>
      <Skeleton width="75%" height={11} />
      <Skeleton width="45%" height={9} />
      <div style={{ display: "flex", gap: 5 }}>
        <Skeleton width={56} height={16} radius={20} />
        <Skeleton width={72} height={16} radius={20} />
      </div>
      <Skeleton width="60%" height={8} style={{ marginTop: "auto" }} />
    </div>
  );
}

function ScheduledPostRowSkeleton() {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
      <div style={{ flexShrink: 0, minWidth: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <Skeleton width={28} height={22} />
        <Skeleton width={24} height={8} />
      </div>
      <div style={{ width: 1, height: 32, background: C.border, flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <Skeleton width="40%" height={11} />
        <Skeleton width="60%" height={8} />
      </div>
    </div>
  );
}

// ── Hub ───────────────────────────────────────────────────────────────────────
function Hub({ setActivePortal, profileName, allCalendars, calCreators, allContentPlans, scheduledPosts, newCalendar, openCalendar, deleteCalendar, can, loadAllContentPlans, calendarsLoading, contentPlansLoading, scheduledPostsLoading }) {
  const today = new Date();
  const { user } = useApp();
  const [hoveredHubCard, setHoveredHubCard] = useState(null);
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

  const statusColor = { approved: "#CCFF00", pending: C.meta, denied: C.error };

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
          {calendarsLoading && recentCals.length === 0 && (
            <>
              <CalendarCardSkeleton />
              <CalendarCardSkeleton />
              <CalendarCardSkeleton />
            </>
          )}
          {recentCals.map(cal => (
            <div key={cal.id} style={{ position: "relative", flexShrink: 0 }}
              onMouseEnter={() => setHoveredHubCard(cal.id)}
              onMouseLeave={() => setHoveredHubCard(null)}>
              <button onClick={() => openCalendar(cal)}
                aria-label={`Open ${cal.client_name} calendar`}
                style={{ width: 200, height: 110, background: C.surface, border: `1px solid ${hoveredHubCard === cal.id ? C.accent : C.border}`, borderRadius: 14, padding: "14px 16px", cursor: "pointer", transition: "border-color 0.15s", display: "flex", flexDirection: "column", textAlign: "left", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, minWidth: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: C.accent, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5, color: "#000", lineHeight: 1.2 }}>{MONTHS[cal.month].slice(0, 3)}</span>
                    <span style={{ fontFamily: MONO, fontSize: 7, color: "#000", lineHeight: 1.2 }}>{cal.year}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: SANS }}>{cal.client_name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2, minWidth: 0 }}>
                      <div style={{ fontFamily: MONO, fontSize: 9, color: C.meta, textTransform: "uppercase", letterSpacing: 1, flexShrink: 0 }}>
                        {MONTHS[cal.month].slice(0, 3)} {cal.year}
                      </div>
                      {cal.user_id !== user?.id && (
                        <span style={{ ...BADGE, overflow: "hidden", textOverflow: "ellipsis", maxWidth: 80 }}>By {calCreators?.[cal.user_id]?.name || "teammate"}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: C.meta, letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {cal.updated_at ? `Saved ${new Date(cal.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "—"}
                  {cal.last_updated_by ? ` · ${cal.last_updated_by}` : ""}
                </div>
              </button>
              {cal.user_id === user?.id && (
                <button
                  onClick={e => { e.stopPropagation(); deleteCalendar(cal); }}
                  style={{
                    position: "absolute", top: 8, right: 8,
                    padding: "4px 7px", fontSize: 14, lineHeight: 1,
                    opacity: hoveredHubCard === cal.id ? 1 : 0,
                    pointerEvents: hoveredHubCard === cal.id ? "auto" : "none",
                    color: C.meta, border: "none", background: "transparent", cursor: "pointer",
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.error; }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.meta; }}
                  title="Delete calendar"
                >×</button>
              )}
            </div>
          ))}
          {/* Dashed "New Calendar" card */}
          <button onClick={newCalendar}
            aria-label="Create new calendar"
            style={{ width: 200, height: 110, flexShrink: 0, border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", transition: "all 0.15s", color: C.meta, background: "transparent" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = C.meta; }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px" }}>New Calendar</span>
          </button>
        </div>
      </div>

      {/* Recent Content Plans */}
      {can("content_plan_creator") && (
        <div style={{ marginBottom: 40 }}>
          <SectionHeader label="Recent Content Plans" />
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {contentPlansLoading && recentPlans.length === 0 && (
              <>
                <ContentPlanCardSkeleton />
                <ContentPlanCardSkeleton />
                <ContentPlanCardSkeleton />
              </>
            )}
            {recentPlans.map(plan => {
              const planStatus = plan.items
                ? (plan.items.every(i => i.approval_status === "approved") ? "approved" : "pending")
                : "pending";
              return (
                <button key={plan.id} onClick={() => { loadAllContentPlans(); setActivePortal("content-plan"); }}
                  aria-label={`Open content plan for ${plan.client_name || "untitled"}`}
                  style={{ width: 200, flexShrink: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", cursor: "pointer", transition: "border-color 0.15s", display: "flex", flexDirection: "column", textAlign: "left" }}
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
                </button>
              );
            })}
            {/* Dashed "New Plan" card */}
            <button onClick={() => { loadAllContentPlans(); setActivePortal("content-plan"); }}
              aria-label="Go to content plans"
              style={{ width: 200, flexShrink: 0, border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", minHeight: 90, transition: "all 0.15s", color: C.meta, background: "transparent" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = C.meta; }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px" }}>New Plan</span>
            </button>
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
          {scheduledPostsLoading && upcomingPosts.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ScheduledPostRowSkeleton />
              <ScheduledPostRowSkeleton />
              <ScheduledPostRowSkeleton />
            </div>
          ) : upcomingPosts.length === 0 ? (
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.meta, textTransform: "uppercase", letterSpacing: "1.5px", padding: "24px 0" }}>No upcoming posts</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {upcomingPosts.map(post => (
                <button key={post.id} onClick={() => setActivePortal("scheduling")}
                  aria-label={`View ${post.client_name} scheduled post`}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "border-color 0.15s", width: "100%", textAlign: "left" }}
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
                </button>
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
  allCalendars, calCreators, schedulingCalId,
  openCalendar, newCalendar, deleteCalendar, addToSchedule,
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
  workspaceClientId, setWorkspaceClientId,
  workspaceCalendarId, setWorkspaceCalendarId,
  newMonthForClient,
  addClientDirect,
  toggleClientSmmActive,
  deleteClient,
  calendarsLoading, contentPlansLoading, scheduledPostsLoading,
}) {
  const { can } = useApp();
  const [adminInitialTab, setAdminInitialTab] = useState(null);
  const [workspaceTab, setWorkspaceTab] = useState("grid");

  function openRolePerms() {
    setAdminInitialTab("roles");
    setActivePortal("admin");
  }

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
        onOpenRolePerms={openRolePerms}
        clients={(clients || []).filter(c => c.smm_active !== false)}
        workspaceClientId={workspaceClientId}
        onSelectClient={(id) => { setWorkspaceClientId(id); setWorkspaceCalendarId(null); setActivePortal("clients"); }}
        addClientDirect={addClientDirect}
      />

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflowY: "auto", background: C.canvas }}>

        {activePortal === null && (
          <Hub
            setActivePortal={setActivePortal}
            profileName={profileName}
            allCalendars={allCalendars}
            calCreators={calCreators}
            allContentPlans={allContentPlans}
            scheduledPosts={scheduledPosts}
            newCalendar={newCalendar}
            openCalendar={openCalendar}
            deleteCalendar={deleteCalendar}
            can={can}
            loadAllContentPlans={loadAllContentPlans}
            calendarsLoading={calendarsLoading}
            contentPlansLoading={contentPlansLoading}
            scheduledPostsLoading={scheduledPostsLoading}
          />
        )}

        {activePortal === "calendar" && (
          <CalendarListPortal
            allCalendars={allCalendars} calCreators={calCreators}
            schedulingCalId={schedulingCalId} openCalendar={openCalendar}
            newCalendar={newCalendar} deleteCalendar={deleteCalendar} addToSchedule={addToSchedule}
            setActivePortal={setActivePortal}
            scheduledPosts={scheduledPosts}
            calendarsLoading={calendarsLoading}
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
            scheduledPostsLoading={scheduledPostsLoading}
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
            initialTab={adminInitialTab}
            clients={clients || []}
            toggleClientSmmActive={toggleClientSmmActive}
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
            contentPlansLoading={contentPlansLoading}
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

        {activePortal === "grid" && can("grid_creator") && (
          <GridCreatorPortal setActivePortal={setActivePortal} />
        )}

        {activePortal === "clients" && can("calendar_creator") && (() => {
          const workspaceClient = clients?.find(c => c.id === workspaceClientId) || null;
          const workspaceCalendar = allCalendars?.find(c => c.id === workspaceCalendarId) || null;

          if (workspaceClient && workspaceCalendar) {
            return (
              <MonthWorkspace
                calendar={workspaceCalendar}
                client={workspaceClient}
                allCalendars={allCalendars}
                onBack={() => setWorkspaceCalendarId(null)}
                onOpenCalendar={openCalendar}
                activeTab={workspaceTab}
                setActiveTab={setWorkspaceTab}
                deleteCalendar={deleteCalendar}
              />
            );
          }

          if (workspaceClient) {
            return (
              <ClientPortal
                client={workspaceClient}
                allCalendars={allCalendars}
                onBack={() => setWorkspaceClientId(null)}
                onSelectCalendar={(cal) => setWorkspaceCalendarId(cal.id)}
                onNewMonth={newMonthForClient}
                deleteCalendar={deleteCalendar}
              />
            );
          }

          return (
            <ClientListPortal
              clients={clients || []}
              allCalendars={allCalendars}
              setWorkspaceClientId={(id) => { setWorkspaceClientId(id); setWorkspaceCalendarId(null); }}
              deleteClient={deleteClient}
            />
          );
        })()}
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
            <input autoFocus aria-label="Your display name" value={profileInput} onChange={e => setProfileInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveProfile()} placeholder="Your name..."
              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16, background: C.canvas, color: C.text, fontFamily: SANS }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveProfile} style={{ flex: 1, padding: "10px 0", background: C.accent, color: "#000", border: "none", borderRadius: 24, fontWeight: 700, fontSize: 11, cursor: "pointer", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: MONO }}>Save</button>
              <button onClick={() => setEditingProfile(false)} style={{ padding: "10px 16px", background: "transparent", color: C.meta, border: `1px solid ${C.border}`, borderRadius: 24, fontSize: 11, cursor: "pointer", fontFamily: MONO, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}


      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  );
}
