import { useState, useRef, useEffect, useMemo } from "react";
import { C, SANS, MONO, PAGE_HEADER, PAGE_TITLE, BTN_ROW, primaryBtn, ghostBtn, dangerBtn } from "../theme";
import MultiMonthFeedGrid from "../components/MultiMonthFeedGrid";
import DrivePanel from "../components/DrivePanel";
import NewMonthDialog from "../components/NewMonthDialog";
import { compressToBlob, uploadToCloudinary, loadGsiScript, postsToGridItems, gridItemsToPostsObj } from "../utils";
import { MONTHS } from "../constants";
import { useApp } from "../AppContext";
import { supabase } from "../supabase";

const GOOGLE_CLIENT_ID = "988412963391-j36f4j6or67871i599o17ui2nai59pi9.apps.googleusercontent.com";

export default function GridCreatorPortal() {
  const { showToast, user, clients = [], allCalendars = [], createCalendarForClient } = useApp();

  // Grid state
  const [gridItems, setGridItems] = useState([]);
  const [pinnedCount, setPinnedCount] = useState(0);
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Client + calendar binding (single source of truth — same calendar_drafts.posts row
  // that CalendarBuilder reads, so changes here propagate to the calendar view).
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [newMonthOpen, setNewMonthOpen] = useState(false);

  // History snapshots = sibling calendars for the same client, excluding the active one.
  const [historySnapshots, setHistorySnapshots] = useState([]);
  const [collapsedHistory, setCollapsedHistory] = useState({});

  // Drive state (fully local, no App.jsx coupling)
  const [driveToken, setDriveToken] = useState(null);
  const [driveOpen, setDriveOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [drivePanelWidth, setDrivePanelWidth] = useState(300);
  const [driveUploadProgress, setDriveUploadProgress] = useState({ active: false, done: 0, total: 0, day: null, postIdx: null });

  const addFileInputRef = useRef(null);
  const originalPostsObjRef = useRef(null);

  // Sorted client list for the picker
  const clientOptions = [...clients]
    .filter(c => c?.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Calendars for the selected client, newest first. Memoized so effect deps
  // referencing it don't fire on every render.
  const clientCalendars = useMemo(() => (
    [...allCalendars]
      .filter(c => c.client_id === selectedClientId)
      .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))
  ), [allCalendars, selectedClientId]);

  // When the client changes, clear any prior calendar binding so we don't show
  // stale grid contents from a different client.
  useEffect(() => {
    setSelectedCalendarId("");
    setGridItems([]);
    setHistorySnapshots([]);
  }, [selectedClientId]);

  // If we just created the first calendar for a client (or one was added
  // externally) and nothing is selected yet, auto-select the newest.
  useEffect(() => {
    if (!selectedClientId || selectedCalendarId) return;
    if (clientCalendars[0]) setSelectedCalendarId(clientCalendars[0].id);
  }, [selectedClientId, clientCalendars, selectedCalendarId]);

  // Load gridItems from the active calendar's most recent draft (mirrors GridView).
  useEffect(() => {
    if (!selectedCalendarId) return;
    setLoading(true);
    supabase.from("calendar_drafts")
      .select("posts")
      .eq("calendar_id", selectedCalendarId)
      .order("saved_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const postsObj = data?.[0]?.posts;
        originalPostsObjRef.current = postsObj || null;
        setGridItems(postsToGridItems(postsObj));
        setPinnedCount(postsObj?._meta?.pinnedCount ?? 0);
        setLoading(false);
      });
  }, [selectedCalendarId]);

  // History = up to the last 3 sibling calendars, excluding the active one.
  useEffect(() => {
    if (!selectedClientId || !selectedCalendarId) { setHistorySnapshots([]); return; }
    const sibling = clientCalendars
      .filter(c => c.id !== selectedCalendarId)
      .slice(0, 3);
    if (!sibling.length) { setHistorySnapshots([]); return; }

    let cancelled = false;
    Promise.all(sibling.map(async cal => {
      const { data } = await supabase.from("calendar_drafts")
        .select("posts")
        .eq("calendar_id", cal.id)
        .order("saved_at", { ascending: false })
        .limit(1);
      const items = postsToGridItems(data?.[0]?.posts);
      return {
        calendarId: cal.id,
        month: cal.month,
        year: cal.year,
        posts: items.map((item, i) => ({
          day: i,
          postIdx: 0,
          imageUrls: item.imageUrl ? [item.imageUrl] : [],
          ...item._src,
        })),
      };
    })).then(snaps => { if (!cancelled) setHistorySnapshots(snaps); });
    return () => { cancelled = true; };
  }, [selectedClientId, selectedCalendarId, clientCalendars]);

  // ── Data adapter ──────────────────────────────────────────────────────────────
  // Projects flat gridItems into the shape the grid components expect.
  const allPosts = gridItems.map((item, i) => ({
    day: i,
    postIdx: 0,
    imageUrls: item.imageUrl ? [item.imageUrl] : [],
    contentType: "Photo",
  }));

  function handleSwap(dayA, _idxA, dayB) {
    setGridItems(items => {
      const next = [...items];
      [next[dayA], next[dayB]] = [next[dayB], next[dayA]];
      return next;
    });
  }

  function toggleHistoryCollapse(calendarId) {
    setCollapsedHistory(prev => ({ ...prev, [calendarId]: !prev[calendarId] }));
  }

  // Save the current order back to calendar_drafts.posts so that CalendarBuilder
  // and the GridView tab see the same data. Mirrors GridView.saveGrid.
  async function saveGrid() {
    if (!selectedCalendarId || !user) {
      showToast("Pick a client and month before saving.", "error");
      return;
    }
    setSaving(true);
    try {
      const postsObj = gridItemsToPostsObj(gridItems, { pinnedCount }, originalPostsObjRef.current);
      const { error } = await supabase.from("calendar_drafts").insert({
        calendar_id: selectedCalendarId,
        user_id: user.id,
        label: "Grid reorder",
        posts: postsObj,
        saved_at: new Date().toISOString(),
      });
      if (error) throw error;
      originalPostsObjRef.current = postsObj;
      showToast("Grid order saved", "success");
    } catch (e) {
      showToast("Save failed: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleNewMonthConfirm({ month, year }) {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client || !createCalendarForClient) return;
    const fromCalendar = clientCalendars[0] || null;
    const cal = await createCalendarForClient(client, fromCalendar, { month, year });
    if (cal) setSelectedCalendarId(cal.id);
  }

  // ── Drive ─────────────────────────────────────────────────────────────────────
  async function connectDrive() {
    try {
      await loadGsiScript();
    } catch {
      showToast("Failed to load Google auth — check your connection.", "error");
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      callback: (response) => {
        if (response.access_token) {
          setDriveToken(response.access_token);
          setDriveOpen(true);
        }
      },
    });
    client.requestAccessToken();
  }

  async function fetchDriveUrls(fileInfos, onProgress) {
    return Promise.all(fileInfos.map(async fi => {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fi.id}?alt=media`, {
        headers: { Authorization: `Bearer ${driveToken}` },
      });
      if (!res.ok) throw new Error(`Fetch failed for ${fi.id}`);
      const blob = await res.blob();
      const compressed = await compressToBlob(new File([blob], "drive-img.jpg", { type: blob.type }));
      const url = await uploadToCloudinary(compressed);
      if (onProgress) onProgress();
      return url;
    }));
  }

  async function handleDriveBatchImport(fileInfos) {
    if (!driveToken || !fileInfos.length) return;
    if (!selectedCalendarId) { showToast("Pick a client and month before adding images.", "error"); return; }
    try {
      setDriveUploadProgress({ active: true, done: 0, total: fileInfos.length, day: null, postIdx: null });
      const urls = await fetchDriveUrls(fileInfos, () =>
        setDriveUploadProgress(p => ({ ...p, done: p.done + 1 }))
      );
      setGridItems(items => [
        ...items,
        ...urls.map(imageUrl => ({ id: Date.now() + Math.random(), imageUrl, _src: { imageUrls: [imageUrl], contentType: "Photo" } })),
      ]);
      showToast(`${urls.length} image${urls.length !== 1 ? "s" : ""} added — hit Save Order to persist`, "success");
    } catch (e) {
      showToast("Drive import failed: " + e.message, "error");
    } finally {
      setDriveUploadProgress({ active: false, done: 0, total: 0, day: null, postIdx: null });
    }
  }

  // ── Local file import ─────────────────────────────────────────────────────────
  async function handleBatchImport(files) {
    const fileList = [...files];
    if (!fileList.length) return;
    if (!selectedCalendarId) { showToast("Pick a client and month before adding images.", "error"); return; }
    try {
      setDriveUploadProgress({ active: true, done: 0, total: fileList.length, day: null, postIdx: null });
      const urls = await Promise.all(fileList.map(async file => {
        const compressed = await compressToBlob(file);
        const url = await uploadToCloudinary(compressed);
        setDriveUploadProgress(p => ({ ...p, done: p.done + 1 }));
        return url;
      }));
      setGridItems(items => [
        ...items,
        ...urls.map(imageUrl => ({ id: Date.now() + Math.random(), imageUrl, _src: { imageUrls: [imageUrl], contentType: "Photo" } })),
      ]);
      showToast(`${urls.length} image${urls.length !== 1 ? "s" : ""} added — hit Save Order to persist`, "success");
    } catch (e) {
      showToast("Upload failed: " + e.message, "error");
    } finally {
      setDriveUploadProgress({ active: false, done: 0, total: 0, day: null, postIdx: null });
    }
  }

  const postCount = gridItems.length;
  const hasHistory = selectedClientId && historySnapshots.length > 0;
  const calendarBound = !!selectedCalendarId;
  const isEmptyFeed = gridItems.length === 0 && !hasHistory;

  const newMonthDefaults = clientCalendars[0]
    ? {
        month: (clientCalendars[0].month + 1) % 12,
        year: clientCalendars[0].month === 11 ? clientCalendars[0].year + 1 : clientCalendars[0].year,
      }
    : { month: new Date().getMonth(), year: new Date().getFullYear() };

  const activeCal = clientCalendars.find(c => c.id === selectedCalendarId) || null;

  const pickerStyle = {
    padding: "8px 10px",
    background: C.canvas, color: C.text,
    border: `1.5px solid ${C.border}`, borderRadius: 8,
    fontSize: 12, fontFamily: SANS, outline: "none",
    maxWidth: 200,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.canvas, fontFamily: SANS, position: "relative" }}>

      {/* PAGE HEADER */}
      <div style={PAGE_HEADER}>
        <div style={PAGE_TITLE}>Grid Creator</div>
      </div>

      {/* TAB ROW */}
      <div style={{
        padding: "0 44px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 0,
        background: C.canvas,
      }}>
        <div style={{
          padding: "12px 0 11px",
          fontSize: 11, fontFamily: MONO, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "1.5px", color: C.accent,
          borderBottom: `2px solid ${C.accent}`,
          marginBottom: -1,
        }}>
          Feed Grid
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ ...BTN_ROW, padding: "8px 0", alignItems: "center" }}>
          <select
            value={selectedClientId}
            onChange={e => setSelectedClientId(e.target.value)}
            style={pickerStyle}
          >
            <option value="">— Pick client —</option>
            {clientOptions.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedCalendarId}
            onChange={e => setSelectedCalendarId(e.target.value)}
            disabled={!selectedClientId}
            style={{ ...pickerStyle, opacity: selectedClientId ? 1 : 0.5 }}
          >
            <option value="">{selectedClientId ? "— Pick month —" : "— Pick client first —"}</option>
            {clientCalendars.map(c => (
              <option key={c.id} value={c.id}>{MONTHS[c.month]} {c.year}</option>
            ))}
          </select>

          {selectedClientId && (
            <button style={ghostBtn} onClick={() => setNewMonthOpen(true)}>
              + New Month
            </button>
          )}

          {gridItems.length > 0 && calendarBound && (
            <button style={primaryBtn} onClick={saveGrid} disabled={saving}>
              {saving ? "Saving..." : "Save Order"}
            </button>
          )}
          <label
            style={{
              ...primaryBtn,
              cursor: calendarBound ? "pointer" : "not-allowed",
              opacity: calendarBound ? 1 : 0.5,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            + Add Images
            <input
              ref={addFileInputRef}
              type="file"
              accept="image/*"
              multiple
              disabled={!calendarBound}
              style={{ display: "none" }}
              onChange={e => { handleBatchImport(e.target.files); e.target.value = ""; }}
            />
          </label>
          {gridItems.length > 0 && (
            <button
              style={dangerBtn}
              onClick={() => { setGridItems([]); setPinnedCount(0); }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, overflowY: "auto", padding: "40px 44px", paddingRight: driveOpen ? drivePanelWidth + 60 : 44, transition: "padding-right 0.2s ease" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", background: "#fff", borderRadius: 8, overflow: "hidden" }}>

          {/* PROFILE HEADER MOCK */}
          <div style={{ marginBottom: 0, padding: "20px 16px 16px", borderBottom: "1px solid #dbdbdb" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {/* Avatar */}
              <div style={{
                width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
                border: `2px solid ${C.accent}`,
                background: "#f0f0f0",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 26, opacity: 0.4 }}>👤</span>
              </div>

              {/* Handle + stats */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontFamily: MONO, color: "#8e8e8e", fontWeight: 700 }}>@</span>
                  <input
                    value={handle}
                    onChange={e => setHandle(e.target.value)}
                    placeholder="username"
                    style={{
                      background: "transparent", border: "none", outline: "none",
                      fontSize: 15, fontWeight: 700, color: "#000", fontFamily: SANS,
                      width: "100%", minWidth: 0,
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 20, fontSize: 12, fontFamily: SANS }}>
                  <span>
                    <strong style={{ color: "#000" }}>{postCount}</strong>
                    <span style={{ color: "#8e8e8e", marginLeft: 4 }}>posts</span>
                  </span>
                  <span style={{ color: "#8e8e8e" }}>— followers</span>
                  <span style={{ color: "#8e8e8e" }}>— following</span>
                </div>
                {activeCal && (
                  <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 9, color: "#8e8e8e", textTransform: "uppercase", letterSpacing: "1.2px" }}>
                    Editing {MONTHS[activeCal.month]} {activeCal.year}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* GRID */}
          <div style={{ marginTop: 0 }}>
            {!calendarBound ? (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 14, height: 280,
                border: `1.5px dashed ${C.border}`, borderRadius: 8,
                color: "#8e8e8e", fontFamily: MONO, fontSize: 10, fontWeight: 700,
                letterSpacing: "1.5px", textTransform: "uppercase", textAlign: "center",
                padding: "0 24px",
              }}>
                <span style={{ fontSize: 32, opacity: 0.3 }}>🗓️</span>
                {selectedClientId
                  ? "Pick a month — or hit + New Month — to start a feed"
                  : "Pick a client to start"}
              </div>
            ) : loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 280, color: "#8e8e8e", fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "1.5px" }}>
                Loading grid...
              </div>
            ) : isEmptyFeed ? (
              driveUploadProgress.active ? (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 14, height: 280,
                  border: `1.5px dashed ${C.accent}`, borderRadius: 8,
                  background: "#f5f5f5",
                }}>
                  <div style={{ width: 36, height: 36, border: "3.5px solid #dbdbdb", borderTop: `3.5px solid ${C.accent}`, borderRadius: "50%", animation: "cardSpin 0.75s linear infinite" }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#8e8e8e", fontFamily: MONO, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {driveUploadProgress.total > 1 ? `${driveUploadProgress.done} / ${driveUploadProgress.total} uploading` : "Uploading..."}
                  </span>
                </div>
              ) : (
              <label
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 14, height: 280, cursor: "pointer",
                  border: `1.5px dashed ${dragActive ? C.accent : "#dbdbdb"}`, borderRadius: 8,
                  color: dragActive ? C.accent : "#8e8e8e", fontFamily: MONO, fontSize: 10, fontWeight: 700,
                  letterSpacing: "1.5px", textTransform: "uppercase",
                  transition: "border-color 0.15s, color 0.15s",
                }}
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragEnter={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragActive(false);
                  const raw = e.dataTransfer.getData("driveFileIds");
                  if (raw) { handleDriveBatchImport(JSON.parse(raw)); return; }
                  const files = e.dataTransfer.files;
                  if (files?.length) handleBatchImport(files);
                }}
              >
                <span style={{ fontSize: 32, opacity: dragActive ? 0.8 : 0.3 }}>📸</span>
                Drop images here or click to add
                <input type="file" accept="image/*" multiple style={{ display: "none" }}
                  onChange={e => { handleBatchImport(e.target.files); e.target.value = ""; }} />
              </label>
              )
            ) : (
              <>
                {gridItems.length === 0 && hasHistory && (
                  <label
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      gap: 10, height: 140, cursor: "pointer",
                      borderBottom: "1px solid #ececec",
                      color: dragActive ? C.accent : "#8e8e8e", fontFamily: MONO, fontSize: 10, fontWeight: 700,
                      letterSpacing: "1.5px", textTransform: "uppercase", background: "#fafafa",
                    }}
                    onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={e => {
                      e.preventDefault(); setDragActive(false);
                      const raw = e.dataTransfer.getData("driveFileIds");
                      if (raw) { handleDriveBatchImport(JSON.parse(raw)); return; }
                      const files = e.dataTransfer.files;
                      if (files?.length) handleBatchImport(files);
                    }}
                  >
                    <span style={{ fontSize: 24, opacity: 0.4 }}>📸</span>
                    Drop images for the new month
                    <input type="file" accept="image/*" multiple style={{ display: "none" }}
                      onChange={e => { handleBatchImport(e.target.files); e.target.value = ""; }} />
                  </label>
                )}
                <MultiMonthFeedGrid
                  workingPosts={allPosts}
                  history={historySnapshots}
                  collapsed={collapsedHistory}
                  onCollapseToggle={toggleHistoryCollapse}
                  onSwap={handleSwap}
                  pinnedCount={pinnedCount}
                  setPinnedCount={setPinnedCount}
                />
              </>
            )}
          </div>

        </div>
      </div>

      {/* DRIVE FAB */}
      <button
        data-drive-toggle
        onClick={driveToken ? () => setDriveOpen(o => !o) : connectDrive}
        title={driveToken ? "Toggle Drive panel" : "Connect Google Drive"}
        style={{
          position: "fixed",
          bottom: 28,
          right: driveOpen ? drivePanelWidth + 14 : 24,
          zIndex: 498,
          background: driveOpen ? C.accent : C.canvas,
          color: driveOpen ? "#000" : driveToken ? C.accent : C.meta,
          border: driveToken && !driveOpen ? `1.5px solid rgba(204,255,0,0.25)` : "none",
          borderRadius: 28,
          padding: "11px 20px",
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.05em",
          cursor: "pointer",
          fontFamily: MONO,
          boxShadow: driveOpen ? "0 4px 20px rgba(204,255,0,0.25)" : "0 4px 24px rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          gap: 7,
          transition: "right 0.2s ease, background 0.15s, box-shadow 0.15s",
          userSelect: "none",
          textTransform: "uppercase",
        }}
      >
        <span style={{ fontSize: 13 }}>📁</span>
        {driveToken ? (driveOpen ? "Close Drive" : "Drive") : "Connect Drive"}
        {driveToken && !driveOpen && (
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, flexShrink: 0 }} />
        )}
      </button>

      {/* DRIVE PANEL */}
      {driveToken && (
        <DrivePanel
          token={driveToken}
          isOpen={driveOpen}
          onClose={() => setDriveOpen(false)}
          onTokenExpired={() => { setDriveToken(null); setDriveOpen(false); showToast("Drive session expired — click Drive to reconnect.", "error"); }}
          width={drivePanelWidth}
          onWidthChange={setDrivePanelWidth}
          linkPickMode={{ active: false }}
          onExitPickMode={() => {}}
        />
      )}

      <NewMonthDialog
        open={newMonthOpen}
        onClose={() => setNewMonthOpen(false)}
        onConfirm={handleNewMonthConfirm}
        defaultMonth={newMonthDefaults.month}
        defaultYear={newMonthDefaults.year}
      />

      <style>{`
        @keyframes cardSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        html[data-pdf-export="1"] [data-drive-toggle],
        html[data-pdf-export="1"] [data-drive-panel] { display: none !important; }
      `}</style>
    </div>
  );
}
