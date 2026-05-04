import { SANS, MONO, DISP, C, PAGE_HEADER, PAGE_TITLE, dangerBtn } from "../theme";
import { MONTHS, PORTALS } from "../constants";
import { useApp } from "../AppContext";
import GridView from "./GridView";
import SchedulerTab from "./SchedulerTab";

const TABS = [
  { key: "calendar",  label: "Calendar" },
  { key: "grid",      label: "Feed Grid" },
  { key: "scheduler", label: "Scheduler" },
  { key: "content",   label: "Content Plan" },
];

export default function MonthWorkspace({
  calendar,
  client,
  allCalendars,
  onBack,
  onOpenCalendar,
  activeTab,
  setActiveTab,
  deleteCalendar,
  scheduledPosts,
  queueDays,
  removeScheduledPost,
  toggleNotify,
  loadDraftPostsFor,
  allContentPlans = [],
  openContentPlan,
  startContentPlanForMonth,
  setActivePortal,
}) {
  const { user, can } = useApp();
  const canDelete = calendar.user_id === user?.id || can("admin_portal");
  const monthPlan = (allContentPlans || [])
    .filter(p => p.client_id === client?.id && p.month === calendar.month && p.year === calendar.year)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0] || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.canvas, fontFamily: SANS }}>

      {/* Header */}
      <div style={{ ...PAGE_HEADER, paddingBottom: 0, position: "relative" }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: C.meta, fontFamily: MONO, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", cursor: "pointer", padding: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}
        >
          ← {client?.name || "Clients"}
        </button>
        <div style={{ ...PAGE_TITLE, position: "absolute", left: 0, right: 0, textAlign: "center", pointerEvents: "none" }}>
          {MONTHS[calendar.month]} {calendar.year}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        padding: "0 44px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 0,
        background: C.canvas,
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <div
              key={tab.key}
              onClick={() => {
                if (tab.key === "calendar") {
                  onOpenCalendar(calendar);
                } else if (tab.key === "content") {
                  if (monthPlan) {
                    openContentPlan?.(monthPlan, { fromMonth: true });
                    setActivePortal?.(PORTALS.CONTENT_PLAN);
                  } else {
                    startContentPlanForMonth?.({
                      clientId: client?.id,
                      clientName: client?.name || "",
                      month: calendar.month,
                      year: calendar.year,
                    });
                  }
                } else {
                  setActiveTab(tab.key);
                }
              }}
              style={{
                padding: "14px 20px 13px",
                fontSize: 11, fontFamily: MONO, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "1.5px",
                color: isActive ? C.accent : C.meta,
                borderBottom: isActive ? `2px solid ${C.accent}` : "2px solid transparent",
                marginBottom: -1,
                cursor: "pointer",
                transition: "color 0.12s",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = C.text; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = C.meta; }}
            >
              {tab.label}
            </div>
          );
        })}
        <div style={{ flex: 1 }} />
        {canDelete && activeTab !== "grid" && (
          <button
            onClick={() => deleteCalendar(calendar)}
            style={{ ...dangerBtn, marginRight: 4 }}
          >
            Delete Month
          </button>
        )}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {activeTab === "calendar" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            <div style={{ fontFamily: DISP, fontSize: 40, color: C.text, lineHeight: 1 }}>
              {MONTHS[calendar.month]} {calendar.year}
            </div>
            <div style={{ fontFamily: SANS, fontSize: 14, color: C.meta }}>
              Click Calendar tab to open full editor
            </div>
            <button
              onClick={() => onOpenCalendar(calendar)}
              style={{ marginTop: 8, padding: "12px 32px", background: C.accent, color: "#000", border: "none", borderRadius: 24, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: MONO, textTransform: "uppercase", letterSpacing: "1.5px" }}
            >
              Open Calendar Editor →
            </button>
          </div>
        )}

        {activeTab === "grid" && (
          <GridView
            calendarId={calendar.id}
            clientId={client?.id}
            allCalendars={allCalendars}
          />
        )}

        {activeTab === "scheduler" && (
          <SchedulerTab
            calendar={calendar}
            scheduledPosts={scheduledPosts}
            queueDays={queueDays}
            removeScheduledPost={removeScheduledPost}
            toggleNotify={toggleNotify}
            loadDraftPostsFor={loadDraftPostsFor}
            allCalendars={allCalendars}
            openCalendar={onOpenCalendar}
          />
        )}

      </div>
    </div>
  );
}
