import { useState, useEffect, useRef } from "react";
import { C, SANS, MONO, BTN_ROW, primaryBtn, dangerBtn } from "../theme";
import MultiMonthFeedGrid from "../components/MultiMonthFeedGrid";
import DrivePanel from "../components/DrivePanel";
import { compressToBlob, uploadToCloudinary, loadGsiScript, postsToGridItems, gridItemsToPostsObj } from "../utils";
import { useApp } from "../AppContext";
import { supabase } from "../supabase";

const GOOGLE_CLIENT_ID = "988412963391-j36f4j6or67871i599o17ui2nai59pi9.apps.googleusercontent.com";

export default function GridView({ calendarId, clientId, allCalendars }) {
  const { showToast, user } = useApp();

  const [gridItems, setGridItems] = useState([]);
  const [pinnedCount, setPinnedCount] = useState(0);
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [historySnapshots, setHistorySnapshots] = useState([]);
  const [collapsedHistory, setCollapsedHistory] = useState({});

  const [driveToken, setDriveToken] = useState(null);
  const [driveOpen, setDriveOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [drivePanelWidth, setDrivePanelWidth] = useState(300);
  const [driveUploadProgress, setDriveUploadProgress] = useState({ active: false, done: 0, total: 0, day: null, postIdx: null });
  const addFileInputRef = useRef(null);
  const originalPostsObjRef = useRef(null);

  // Load current calendar's posts
  useEffect(() => {
    if (!calendarId) return;
    setLoading(true);
    supabase.from("calendar_drafts")
      .select("posts")
      .eq("calendar_id", calendarId)
      .order("saved_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const postsObj = data?.[0]?.posts;
        originalPostsObjRef.current = postsObj || null;
        setGridItems(postsToGridItems(postsObj));
        setPinnedCount(postsObj?._meta?.pinnedCount ?? 0);
        setLoading(false);
      });
  }, [calendarId]);

  // Load history for this client (last 3 months strictly older than current)
  useEffect(() => {
    if (!clientId || !calendarId || !allCalendars) return;
    const active = allCalendars.find(x => x.id === calendarId);
    if (!active) { setHistorySnapshots([]); return; }
    const activeKey = active.year * 12 + active.month;
    const sibling = allCalendars
      .filter(c =>
        c.id !== calendarId &&
        (c.client_id === clientId || c.client_name?.toLowerCase() === active.client_name?.toLowerCase()) &&
        (c.year * 12 + c.month) < activeKey
      )
      .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))
      .slice(0, 3);

    if (!sibling.length) { setHistorySnapshots([]); return; }

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
    })).then(setHistorySnapshots);
  }, [clientId, calendarId, allCalendars]);

  function toggleHistoryCollapse(calId) {
    setCollapsedHistory(prev => ({ ...prev, [calId]: !prev[calId] }));
  }

  // Data adapter for MultiMonthFeedGrid
  const allPosts = gridItems.map((item, i) => ({
    day: i, postIdx: 0,
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

  async function saveGrid() {
    if (!calendarId || !user) return;
    setSaving(true);
    try {
      const postsObj = gridItemsToPostsObj(gridItems, { pinnedCount }, originalPostsObjRef.current);
      await supabase.from("calendar_drafts").insert({
        calendar_id: calendarId,
        user_id: user.id,
        label: "Grid reorder",
        posts: postsObj,
        saved_at: new Date().toISOString(),
      });
      originalPostsObjRef.current = postsObj;
      showToast("Grid order saved", "success");
    } catch (e) {
      showToast("Save failed: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // Drive
  async function connectDrive() {
    try { await loadGsiScript(); } catch {
      showToast("Failed to load Google auth — check your connection.", "error");
      return;
    }
    const googleAuthClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      callback: (response) => {
        if (response.access_token) { setDriveToken(response.access_token); setDriveOpen(true); }
      },
    });
    googleAuthClient.requestAccessToken();
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
    try {
      setDriveUploadProgress({ active: true, done: 0, total: fileInfos.length, day: null, postIdx: null });
      const urls = await fetchDriveUrls(fileInfos, () =>
        setDriveUploadProgress(p => ({ ...p, done: p.done + 1 }))
      );
      setGridItems(items => [...items, ...urls.map(imageUrl => ({ id: Date.now() + Math.random(), imageUrl, _src: { imageUrls: [imageUrl], contentType: "Photo" } }))]);
      showToast(`${urls.length} image${urls.length !== 1 ? "s" : ""} added to grid`, "success");
    } catch (e) {
      showToast("Drive import failed: " + e.message, "error");
    } finally {
      setDriveUploadProgress({ active: false, done: 0, total: 0, day: null, postIdx: null }); }
  }

  async function handleBatchImport(files) {
    const fileList = [...files];
    if (!fileList.length) return;
    try {
      setDriveUploadProgress({ active: true, done: 0, total: fileList.length, day: null, postIdx: null });
      const urls = await Promise.all(fileList.map(async file => {
        const compressed = await compressToBlob(file);
        const url = await uploadToCloudinary(compressed);
        setDriveUploadProgress(p => ({ ...p, done: p.done + 1 }));
        return url;
      }));
      setGridItems(items => [...items, ...urls.map(imageUrl => ({ id: Date.now() + Math.random(), imageUrl, _src: { imageUrls: [imageUrl], contentType: "Photo" } }))]);
      showToast(`${urls.length} image${urls.length !== 1 ? "s" : ""} added to grid`, "success");
    } catch (e) {
      showToast("Upload failed: " + e.message, "error");
    } finally {
      setDriveUploadProgress({ active: false, done: 0, total: 0, day: null, postIdx: null });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>

      {/* Tab action row */}
      <div style={{
        padding: "0 44px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 0,
        background: C.canvas,
      }}>
        <div style={{ flex: 1 }} />
        <div style={{ ...BTN_ROW, padding: "8px 0" }}>
          {gridItems.length > 0 && (
            <button style={primaryBtn} onClick={saveGrid} disabled={saving}>
              {saving ? "Saving..." : "Save Order"}
            </button>
          )}
          <label style={{ ...primaryBtn, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            + Add Images
            <input ref={addFileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }}
              onChange={e => { handleBatchImport(e.target.files); e.target.value = ""; }} />
          </label>
          {gridItems.length > 0 && (
            <button style={dangerBtn} onClick={() => { setGridItems([]); setPinnedCount(0); }}>Clear</button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "40px 44px", paddingRight: driveOpen ? drivePanelWidth + 60 : 44, transition: "padding-right 0.2s ease" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", background: "#fff", borderRadius: 8, overflow: "hidden" }}>

          {/* Profile mock header */}
          <div style={{ marginBottom: 0, padding: "20px 16px 16px", borderBottom: "1px solid #dbdbdb" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", flexShrink: 0, border: `2px solid ${C.accent}`, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 26, opacity: 0.4 }}>👤</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontFamily: MONO, color: "#8e8e8e", fontWeight: 700 }}>@</span>
                  <input value={handle} onChange={e => setHandle(e.target.value)} placeholder="username"
                    style={{ background: "transparent", border: "none", outline: "none", fontSize: 15, fontWeight: 700, color: "#000", fontFamily: SANS, width: "100%", minWidth: 0 }} />
                </div>
                <div style={{ display: "flex", gap: 20, fontSize: 12, fontFamily: SANS }}>
                  <span><strong style={{ color: "#000" }}>{gridItems.length}</strong><span style={{ color: "#8e8e8e", marginLeft: 4 }}>posts</span></span>
                  <span style={{ color: "#8e8e8e" }}>— followers</span>
                  <span style={{ color: "#8e8e8e" }}>— following</span>
                </div>
              </div>
            </div>
          </div>

          {/* Seamless multi-month feed grid (working area + read-only history) */}
          <div>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 280, color: "#8e8e8e", fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "1.5px" }}>
                Loading grid...
              </div>
            ) : gridItems.length === 0 && historySnapshots.length === 0 ? (
              driveUploadProgress.active ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, height: 280, border: `1.5px dashed ${C.accent}`, borderRadius: 8, background: "#f5f5f5" }}>
                  <div style={{ width: 36, height: 36, border: "3.5px solid #dbdbdb", borderTop: `3.5px solid ${C.accent}`, borderRadius: "50%", animation: "gridSpin 0.75s linear infinite" }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#8e8e8e", fontFamily: MONO, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {driveUploadProgress.total > 1 ? `${driveUploadProgress.done} / ${driveUploadProgress.total} uploading` : "Uploading..."}
                  </span>
                </div>
              ) : (
                <label style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 14, height: 280, cursor: "pointer",
                  border: `1.5px dashed ${dragActive ? C.accent : "#dbdbdb"}`, borderRadius: 8,
                  color: dragActive ? C.accent : "#8e8e8e", fontFamily: MONO, fontSize: 10, fontWeight: 700,
                  letterSpacing: "1.5px", textTransform: "uppercase", transition: "border-color 0.15s, color 0.15s",
                }}
                  onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                  onDragEnter={e => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={e => {
                    e.preventDefault(); setDragActive(false);
                    const raw = e.dataTransfer.getData("driveFileIds");
                    if (raw) { handleDriveBatchImport(JSON.parse(raw)); return; }
                    const files = e.dataTransfer.files;
                    if (files?.length) handleBatchImport(files);
                  }}
                >
                  <span style={{ fontSize: 32, opacity: dragActive ? 0.8 : 0.3 }}>📸</span>
                  {calendarId ? "No posts yet — add images or open Calendar tab first" : "Drop images here or click to add"}
                  <input type="file" accept="image/*" multiple style={{ display: "none" }}
                    onChange={e => { handleBatchImport(e.target.files); e.target.value = ""; }} />
                </label>
              )
            ) : (
              <MultiMonthFeedGrid
                workingPosts={allPosts}
                history={historySnapshots}
                collapsed={collapsedHistory}
                onCollapseToggle={toggleHistoryCollapse}
                onSwap={handleSwap}
                pinnedCount={pinnedCount}
                setPinnedCount={setPinnedCount}
              />
            )}
          </div>
        </div>
      </div>

      {/* Drive FAB */}
      <button
        data-drive-toggle
        onClick={driveToken ? () => setDriveOpen(o => !o) : connectDrive}
        title={driveToken ? "Toggle Drive panel" : "Connect Google Drive"}
        style={{
          position: "fixed", bottom: 28, right: driveOpen ? drivePanelWidth + 14 : 24, zIndex: 498,
          background: driveOpen ? C.accent : C.canvas,
          color: driveOpen ? "#000" : driveToken ? C.accent : C.meta,
          border: driveToken && !driveOpen ? `1.5px solid rgba(204,255,0,0.25)` : "none",
          borderRadius: 28, padding: "11px 20px", fontSize: 12, fontWeight: 800,
          letterSpacing: "0.05em", cursor: "pointer", fontFamily: MONO,
          boxShadow: driveOpen ? "0 4px 20px rgba(204,255,0,0.25)" : "0 4px 24px rgba(0,0,0,0.35)",
          display: "flex", alignItems: "center", gap: 7, transition: "right 0.2s ease, background 0.15s",
          userSelect: "none", textTransform: "uppercase",
        }}
      >
        <span style={{ fontSize: 13 }}>📁</span>
        {driveToken ? (driveOpen ? "Close Drive" : "Drive") : "Connect Drive"}
        {driveToken && !driveOpen && <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, flexShrink: 0 }} />}
      </button>

      {driveToken && (
        <DrivePanel
          token={driveToken} isOpen={driveOpen}
          onClose={() => setDriveOpen(false)}
          onTokenExpired={() => { setDriveToken(null); setDriveOpen(false); showToast("Drive session expired — reconnect.", "error"); }}
          width={drivePanelWidth} onWidthChange={setDrivePanelWidth}
          linkPickMode={{ active: false }} onExitPickMode={() => {}}
        />
      )}

      <style>{`
        @keyframes gridSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
