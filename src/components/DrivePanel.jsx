import { useState, useRef, useEffect } from "react";
import DriveThumb, { prefetchThumbnails } from "./DriveThumb";
import { C, SANS } from "../theme";

export default function DrivePanel({ token, isOpen, onClose, onTokenExpired, width, onWidthChange, linkPickMode = { active: false }, onExitPickMode }) {
  const [folderStack, setFolderStack] = useState([{ id: "root", name: "My Drive" }]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [lastClickedIdx, setLastClickedIdx] = useState(null);
  const panelRef = useRef(null);
  const currentFolder = folderStack[folderStack.length - 1];


  function startResize(e) {
    e.preventDefault();
    const startX = e.clientX, startW = width;
    function onMove(e) { onWidthChange(Math.min(600, Math.max(200, startW + (startX - e.clientX)))); }
    function onUp() { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  async function loadFolder(folderId) {
    setLoading(true); setError(""); setSelectedIds(new Set());
    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=%27${folderId}%27+in+parents+and+trashed%3Dfalse&fields=files(id%2Cname%2CmimeType%2CthumbnailLink%2CwebViewLink)&orderBy=folder%2CmodifiedTime+desc&pageSize=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.error) { if (data.error.code === 401) { onTokenExpired(); return; } throw new Error(data.error.message); }
      const allFiles = data.files || [];
      setFiles(allFiles);
      const imageFiles = allFiles.filter(f => f.mimeType.startsWith("image/"));
      prefetchThumbnails(imageFiles, token);
    } catch (e) {
      setError(e.message || "Failed to load — try refreshing Drive");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFolder(currentFolder.id); }, [currentFolder.id]);

  const folders = files.filter(f => f.mimeType === "application/vnd.google-apps.folder");
  const images = linkPickMode && linkPickMode.active
    ? files.filter(f => f.mimeType.startsWith("video/"))
    : files.filter(f => f.mimeType.startsWith("image/"));

  function handleImageClick(e, f, idx) {
    if (linkPickMode && linkPickMode.active && linkPickMode.onPick) {
      linkPickMode.onPick(f.webViewLink || "");
      onExitPickMode?.();
      onClose?.();
      return;
    }
    if (e.shiftKey && lastClickedIdx !== null) {
      const lo = Math.min(lastClickedIdx, idx), hi = Math.max(lastClickedIdx, idx);
      setSelectedIds(prev => { const next = new Set(prev); for (let i = lo; i <= hi; i++) next.add(images[i].id); return next; });
    } else {
      setSelectedIds(prev => { const next = new Set(prev); if (next.has(f.id)) next.delete(f.id); else next.add(f.id); return next; });
      setLastClickedIdx(idx);
    }
  }

  function buildDragData(f) {
    const getLink = file => file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
    return (selectedIds.has(f.id) && selectedIds.size > 1)
      ? images.filter(img => selectedIds.has(img.id)).map(img => ({ id: img.id, link: getLink(img) }))
      : [{ id: f.id, link: getLink(f) }];
  }

  const cols = width >= 380 ? 3 : 2;

  return (
    <div ref={panelRef} data-drive-panel style={{ position: "fixed", right: 0, top: 0, height: "100vh", width, background: C.surface, boxShadow: "-4px 0 24px rgba(0,0,0,0.4)", zIndex: 500, display: isOpen ? "flex" : "none", flexDirection: "column", fontFamily: SANS, userSelect: "none" }}>
      <div onMouseDown={startResize} style={{ position: "absolute", left: 0, top: 0, width: 6, height: "100%", cursor: "ew-resize", zIndex: 10 }} />
      <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 4, height: 48, background: "rgba(0,0,0,0.12)", borderRadius: "0 3px 3px 0", pointerEvents: "none" }} />

      <div style={{ background: C.canvas, padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ color: C.accent, fontWeight: 800, fontSize: 11, letterSpacing: "0.08em", marginBottom: 2 }}>GOOGLE DRIVE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 3, overflow: "hidden" }}>
            {folderStack.map((f, i) => (
              <span key={f.id} style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0 }}>
                {i > 0 && <span style={{ color: C.meta, fontSize: 9, flexShrink: 0 }}>›</span>}
                <button onClick={() => i < folderStack.length - 1 && setFolderStack(prev => prev.slice(0, i + 1))} style={{ background: "none", border: "none", color: i === folderStack.length - 1 ? C.text : C.meta, fontSize: 9, cursor: i < folderStack.length - 1 ? "pointer" : "default", padding: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 90, fontFamily: "inherit" }}>{f.name}</button>
              </span>
            ))}
          </div>
        </div>
        <button onClick={() => loadFolder(currentFolder.id)} title="Refresh" style={{ background: "rgba(255,255,255,0.1)", border: "none", color: C.text, borderRadius: 6, width: 28, height: 28, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>↻</button>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: C.text, borderRadius: 6, width: 28, height: 28, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
      </div>

      {folderStack.length > 1 && (
        <button onClick={() => { setFolderStack(prev => prev.slice(0, -1)); setSelectedIds(new Set()); }} style={{ background: C.surface2, border: "none", borderBottom: `1px solid ${C.border}`, padding: "8px 14px", textAlign: "left", fontSize: 12, color: C.meta, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, flexShrink: 0, fontFamily: "inherit" }}>← Back</button>
      )}

      {selectedIds.size > 0 ? (
        <div style={{ padding: "6px 14px", background: C.canvas, borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.text, fontWeight: 700, letterSpacing: "0.05em", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: C.accent }}>{selectedIds.size} selected — drag to a post card or the feed grid</span>
          <button onClick={() => setSelectedIds(new Set())} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: C.text, borderRadius: 4, padding: "2px 8px", fontSize: 10, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, marginLeft: 8 }}>Clear</button>
        </div>
      ) : (
        linkPickMode && linkPickMode.active ? (
          <div style={{ padding: "8px 14px", background: C.canvas, borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.accent, fontWeight: 700, letterSpacing: "0.05em", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>🎬 CLICK A FILE TO USE ITS LINK</span>
            <button onClick={onExitPickMode} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: C.text, borderRadius: 4, padding: "2px 8px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          </div>
        ) : (
          <div style={{ padding: "7px 14px", background: C.surface2, borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.meta, fontWeight: 700, letterSpacing: "0.05em", flexShrink: 0 }}>
            CLICK TO SELECT · SHIFT+CLICK FOR RANGE · DRAG TO CARD ↓
          </div>
        )
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
        {loading && <div style={{ textAlign: "center", padding: "40px 0", color: C.meta, fontSize: 12 }}>Loading...</div>}
        {error && <div style={{ color: C.error, fontSize: 11, padding: "10px 12px", background: "rgba(232,0,28,0.12)", borderRadius: 8, margin: 4 }}>{error}</div>}
        {!loading && !error && (
          <>
            {folders.map(f => (
              <div key={f.id} onClick={() => { setFolderStack(prev => [...prev, { id: f.id, name: f.name }]); setSelectedIds(new Set()); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, cursor: "pointer", marginBottom: 1 }} onMouseEnter={e => e.currentTarget.style.background = C.surface2} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ fontSize: 15 }}>📁</span>
                <span style={{ fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{f.name}</span>
                <span style={{ color: C.meta, fontSize: 12, flexShrink: 0 }}>›</span>
              </div>
            ))}
            {folders.length > 0 && images.length > 0 && <div style={{ borderTop: `1px solid ${C.border}`, margin: "8px 0" }} />}
            {images.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6 }}>
                {images.map((f, idx) => {
                  const isSel = selectedIds.has(f.id);
                  return (
                    <div key={f.id} draggable
                      onClick={e => handleImageClick(e, f, idx)}
                      onDragStart={e => { const d = buildDragData(f); e.dataTransfer.setData("driveFileIds", JSON.stringify(d)); e.dataTransfer.setData("driveFileId", d[0].id); e.dataTransfer.setData("driveFileLink", d[0].link); e.dataTransfer.effectAllowed = "copy"; }}
                      title={f.name}
                      style={{ aspectRatio: "1", borderRadius: 6, overflow: "hidden", background: isSel ? C.canvas : C.surface2, cursor: "grab", position: "relative", outline: isSel ? `2.5px solid ${C.accent}` : "none", outlineOffset: -2 }}
                    >
                      <DriveThumb
                        fileId={f.id}
                        thumbnailLink={f.thumbnailLink}
                        token={token}
                        name={f.name}
                        mimeType={f.mimeType}
                        imgStyle={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none", opacity: isSel ? 0.7 : 1 }}
                      />
                      {isSel && <div style={{ position: "absolute", top: 4, right: 4, background: C.accent, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "#000", pointerEvents: "none" }}>✓</div>}
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.65))", padding: "14px 5px 4px", fontSize: 8, color: C.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", pointerEvents: "none" }}>{f.name}</div>
                    </div>
                  );
                })}
              </div>
            )}
            {files.length === 0 && <div style={{ textAlign: "center", padding: "40px 10px", color: C.meta, fontSize: 12 }}><div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>No images or folders here</div>}
          </>
        )}
      </div>
    </div>
  );
}
