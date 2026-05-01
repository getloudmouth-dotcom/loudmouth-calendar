import { useEffect, useMemo, useState } from "react";

import { useApp } from "../AppContext";
import ScheduleRow from "../components/ScheduleRow";
import { MONTHS } from "../constants";
import {
  SANS, MONO, DISP, C,
  primaryBtn, ghostBtn,
  DISPLAY_TITLE, DISPLAY_SUBTITLE,
} from "../theme";

function dayToIso(year, month, day) {
  return new Date(year, month, day).toISOString().slice(0, 10);
}

function contentTypesForDay(draftPosts, day) {
  const dayPosts = draftPosts?.[day] || [];
  return [...new Set(dayPosts.map(p => p.contentType).filter(Boolean))];
}

function QueueCard({ calendar, day, draftPosts, queueing, onQueue }) {
  const types = contentTypesForDay(draftPosts, day);
  const typesLabel = types.join(", ") || "—";
  const dateObj = new Date(calendar.year, calendar.month, day);

  return (
    <div style={{ background: C.surface, borderRadius: 14, border: `1px dashed ${C.border}`, overflow: "hidden", transition: "border-color 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
      <div style={{ padding: "14px 18px", height: 80, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 36, gap: 1 }}>
          <div style={{ fontFamily: DISP, fontSize: 24, color: C.meta, lineHeight: 1 }}>{day}</div>
          <div style={{ fontFamily: MONO, fontSize: 8, color: C.meta, textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: 1 }}>
            {dateObj.toLocaleDateString("en-US", { month: "short" })}
          </div>
        </div>
        <div style={{ width: 1, alignSelf: "stretch", background: C.border, flexShrink: 0, margin: "6px 0" }} />

        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: C.text, fontFamily: SANS, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1, marginBottom: 6 }}>
            {calendar.client_name}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.meta, textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {typesLabel}
          </div>
        </div>

        <button
          onClick={onQueue}
          disabled={queueing}
          style={{ ...primaryBtn, padding: "8px 14px", fontSize: 10, opacity: queueing ? 0.6 : 1, cursor: queueing ? "default" : "pointer" }}
        >
          {queueing ? "…" : "Opt in to reminders"}
        </button>
      </div>
    </div>
  );
}

export default function SchedulerTab({
  calendar,
  scheduledPosts,
  queueDays,
  removeScheduledPost,
  toggleNotify,
  loadDraftPostsFor,
  allCalendars,
  openCalendar,
}) {
  const { user } = useApp();
  const [draftPosts, setDraftPosts] = useState({});
  const [draftLoading, setDraftLoading] = useState(true);
  const [busyDays, setBusyDays] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDraftLoading(true);
    loadDraftPostsFor(calendar.id).then(posts => {
      if (cancelled) return;
      setDraftPosts(posts || {});
      setDraftLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setDraftPosts({});
      setDraftLoading(false);
    });
    return () => { cancelled = true; };
  }, [calendar.id, loadDraftPostsFor]);

  const sortedDays = useMemo(
    () => [...(calendar.selected_days || [])].sort((a, b) => a - b),
    [calendar.selected_days]
  );

  const myRowsByDate = useMemo(() => {
    const map = {};
    for (const r of scheduledPosts || []) {
      if (r.calendar_id === calendar.id && r.user_id === user?.id) {
        map[r.post_date] = r;
      }
    }
    return map;
  }, [scheduledPosts, calendar.id, user?.id]);

  const optedInUsersFor = (postDate) =>
    (scheduledPosts || [])
      .filter(r => r.calendar_id === calendar.id && r.post_date === postDate)
      .map(r => ({
        userId: r.user_id,
        rowId: r.id,
        name: r.profile?.name || "",
        email: r.profile?.email || "",
        notify: r.notify !== false,
      }));

  const unqueuedDays = sortedDays.filter(day => !myRowsByDate[dayToIso(calendar.year, calendar.month, day)]);

  async function handleQueueOne(day) {
    setBusyDays(prev => { const next = new Set(prev); next.add(day); return next; });
    try {
      await queueDays(calendar, [day]);
    } finally {
      setBusyDays(prev => { const next = new Set(prev); next.delete(day); return next; });
    }
  }

  async function handleQueueAll() {
    if (unqueuedDays.length === 0) return;
    setBulkBusy(true);
    try {
      await queueDays(calendar, unqueuedDays);
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "40px 48px 80px", fontFamily: SANS }}>
      <div style={{ marginBottom: 40, display: "flex", alignItems: "flex-end", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={DISPLAY_TITLE}>Scheduler</div>
          <div style={DISPLAY_SUBTITLE}>
            {sortedDays.length === 0
              ? `No days picked yet for ${MONTHS[calendar.month]} ${calendar.year}.`
              : "We'll email you the morning each post is due."}
          </div>
        </div>
        {unqueuedDays.length > 1 && (
          <button
            onClick={handleQueueAll}
            disabled={bulkBusy}
            style={{ ...ghostBtn, opacity: bulkBusy ? 0.6 : 1, cursor: bulkBusy ? "default" : "pointer" }}
          >
            {bulkBusy ? "…" : `Opt in to all (${unqueuedDays.length})`}
          </button>
        )}
      </div>

      {sortedDays.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.meta, textTransform: "uppercase", letterSpacing: "1px" }}>CAL</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text, fontFamily: SANS }}>No selected days</div>
          <div style={{ fontSize: 13, color: C.meta, textAlign: "center", maxWidth: 360 }}>
            Open the Calendar tab and pick the days you'll be posting. They'll show up here, ready to opt into reminders.
          </div>
        </div>
      ) : draftLoading ? (
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.meta, textTransform: "uppercase", letterSpacing: "1.5px" }}>Loading…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sortedDays.map(day => {
            const isoDate = dayToIso(calendar.year, calendar.month, day);
            const row = myRowsByDate[isoDate];
            if (row) {
              return (
                <ScheduleRow
                  key={`row-${row.id}`}
                  row={row}
                  onRemove={removeScheduledPost}
                  onToggleNotify={toggleNotify}
                  currentUserId={user?.id}
                  optedInUsers={optedInUsersFor(isoDate)}
                  allCalendars={allCalendars}
                  openCalendar={openCalendar}
                />
              );
            }
            return (
              <QueueCard
                key={`queue-${day}`}
                calendar={calendar}
                day={day}
                draftPosts={draftPosts}
                queueing={busyDays.has(day) || bulkBusy}
                onQueue={() => handleQueueOne(day)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
