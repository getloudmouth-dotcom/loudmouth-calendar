import { useState, useRef } from "react";
import { C, SANS, MONO, PAGE_HEADER, PAGE_TITLE, BTN_ROW, primaryBtn, dangerBtn } from "../theme";
import ReorderFeedGrid from "../components/ReorderFeedGrid";
import DrivePanel from "../components/DrivePanel";
import { compressToBlob, uploadToCloudinary } from "../utils";
import { useApp } from "../AppContext";

const GOOGLE_CLIENT_ID = "988412963391-j36f4j6or67871i599o17ui2nai59pi9.apps.googleusercontent.com";

export default function GridCreatorPortal() {
  const { showToast } = useApp();

  // Grid state
  const [gridItems, setGridItems] = useState([]);
  const [pinnedCount, setPinnedCount] = useState(0);
  const [handle, setHandle] = useState("");

  // Drive state (fully local, no App.jsx coupling)
  const [driveToken, setDriveToken] = useState(null);
  const [driveOpen, setDriveOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [drivePanelWidth, setDrivePanelWidth] = useState(300);
  const [driveUploadProgress, setDriveUploadProgress] = useState({ active: false, done: 0, total: 0, day: null, postIdx: null });

  const addFileInputRef = useRef(null);

  // ── Data adapter ──────────────────────────────────────────────────────────────
  // Projects flat gridItems into the shape ReorderFeedGrid expects.
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

  // ── Drive ─────────────────────────────────────────────────────────────────────
  function connectDrive() {
    if (!window.google?.accounts?.oauth2) {
      showToast("Google auth not loaded yet — wait a second and try again.", "error");
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
    try {
      setDriveUploadProgress({ active: true, done: 0, total: fileInfos.length, day: null, postIdx: null });
      const urls = await fetchDriveUrls(fileInfos, () =>
        setDriveUploadProgress(p => ({ ...p, done: p.done + 1 }))
      );
      setGridItems(items => [
        ...items,
        ...urls.map(imageUrl => ({ id: Date.now() + Math.random(), imageUrl })),
      ]);
      showToast(`${urls.length} image${urls.length !== 1 ? "s" : ""} added to grid`, "success");
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
        ...urls.map(imageUrl => ({ id: Date.now() + Math.random(), imageUrl })),
      ]);
      showToast(`${urls.length} image${urls.length !== 1 ? "s" : ""} added to grid`, "success");
    } catch (e) {
      showToast("Upload failed: " + e.message, "error");
    } finally {
      setDriveUploadProgress({ active: false, done: 0, total: 0, day: null, postIdx: null });
    }
  }

  const postCount = gridItems.length;

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

        <div style={{ ...BTN_ROW, padding: "8px 0" }}>
          <label style={{ ...primaryBtn, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            + Add Images
            <input
              ref={addFileInputRef}
              type="file"
              accept="image/*"
              multiple
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
        <div style={{ maxWidth: 520, margin: "0 auto" }}>

          {/* PROFILE HEADER MOCK */}
          <div style={{ marginBottom: 0, padding: "20px 0 16px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {/* Avatar */}
              <div style={{
                width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
                border: `2px solid ${C.accent}`,
                background: `linear-gradient(135deg, ${C.surface2} 0%, ${C.surface} 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 26, opacity: 0.4 }}>👤</span>
              </div>

              {/* Handle + stats */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontFamily: MONO, color: C.meta, fontWeight: 700 }}>@</span>
                  <input
                    value={handle}
                    onChange={e => setHandle(e.target.value)}
                    placeholder="username"
                    style={{
                      background: "transparent", border: "none", outline: "none",
                      fontSize: 15, fontWeight: 700, color: C.text, fontFamily: SANS,
                      width: "100%", minWidth: 0,
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 20, fontSize: 12, fontFamily: SANS }}>
                  <span>
                    <strong style={{ color: C.text }}>{postCount}</strong>
                    <span style={{ color: C.meta, marginLeft: 4 }}>posts</span>
                  </span>
                  <span style={{ color: C.meta }}>— followers</span>
                  <span style={{ color: C.meta }}>— following</span>
                </div>
              </div>
            </div>
          </div>

          {/* GRID */}
          <div style={{ marginTop: 0 }}>
            {gridItems.length === 0 ? (
              <label
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 14, height: 280, cursor: "pointer",
                  border: `1.5px dashed ${dragActive ? C.accent : C.border}`, borderRadius: 8,
                  color: dragActive ? C.accent : C.meta, fontFamily: MONO, fontSize: 10, fontWeight: 700,
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
            ) : (
              <div style={{ height: Math.max(360, Math.ceil((gridItems.length + pinnedCount) / 3) * 180) }}>
                <ReorderFeedGrid
                  allPosts={allPosts}
                  onSwap={handleSwap}
                  onBatchImport={handleBatchImport}
                  onDriveBatchImport={handleDriveBatchImport}
                  driveUploadProgress={driveUploadProgress}
                  pinnedCount={pinnedCount}
                  setPinnedCount={setPinnedCount}
                />
              </div>
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

      <style>{`
        @keyframes cardSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        html[data-pdf-export="1"] [data-drive-toggle],
        html[data-pdf-export="1"] [data-drive-panel] { display: none !important; }
      `}</style>
    </div>
  );
}
