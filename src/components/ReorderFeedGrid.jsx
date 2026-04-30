import { useState } from "react";
import { getSlideCropX, getSlideCropY, getSlideScale, formatDate } from "../utils";
import { C } from "../theme";

export default function ReorderFeedGrid({ allPosts, onSwap, onBatchImport, onDriveBatchImport, driveUploadProgress, pinnedCount, setPinnedCount, lightMode = false }) {
  const [dragSrc, setDragSrc] = useState(null); // { day, postIdx }
  const [hoverTarget, setHoverTarget] = useState(null);
  const [dropHighlight, setDropHighlight] = useState(false);
  const postsWithImages = allPosts.filter(p => p?.imageUrls?.[0] || p?.placeholder);
  const reversed = [...postsWithImages].reverse();
  const padCount = reversed.length % 3 === 0 ? 0 : 3 - (reversed.length % 3);
  // Insert pinned placeholder slots at top-left, pushing real posts right/down
  const pinnedSlots = Array(pinnedCount).fill({ pinned: true });
  const allCells = [...pinnedSlots, ...reversed, ...Array(padCount).fill(null)];
  // Re-pad to keep rows of 3 complete
  const totalPad = allCells.length % 3 === 0 ? 0 : 3 - (allCells.length % 3);
  const cells = [...allCells, ...Array(totalPad).fill(null)];

  return (
    <div
    style={{ border: lightMode ? "1.5px solid #e0e0e0" : `1.5px solid ${dropHighlight ? C.accent : C.border}`, borderRadius: 10, padding: lightMode ? "12px 10px" : "12px 14px", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box", background: lightMode ? "transparent" : (dropHighlight ? C.surface2 : C.surface), transition: "border-color 0.15s, background 0.15s", position: "relative" }}
      onDragOver={e => { const types = [...e.dataTransfer.types].map(t => t.toLowerCase()); if (types.includes("files") || types.includes("drivefileids")) { e.preventDefault(); setDropHighlight(true); } }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDropHighlight(false); }}
      onDrop={e => { e.preventDefault(); setDropHighlight(false); const raw = e.dataTransfer.getData("driveFileIds"); if (raw && onDriveBatchImport) { onDriveBatchImport(JSON.parse(raw)); } else if (e.dataTransfer.files.length && onBatchImport) { onBatchImport(e.dataTransfer.files); } }}
    >
      {driveUploadProgress && driveUploadProgress.active && driveUploadProgress.day === null && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(30,30,30,0.88)", borderRadius: 10, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, border: `3.5px solid ${C.border}`, borderTop: `3.5px solid ${C.accent}`, borderRadius: "50%", animation: "cardSpin 0.75s linear infinite" }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: C.meta, letterSpacing: "0.06em" }}>
            {driveUploadProgress.total > 1 ? `${driveUploadProgress.done} / ${driveUploadProgress.total} UPLOADING` : "UPLOADING..."}
          </span>
        </div>
      )}
      <div className="feed-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <div className="feed-label" style={{ fontSize: 12, fontWeight: 700, color: lightMode ? "#000" : C.text }}>Feed:</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="no-print" style={{ fontSize: 9, color: lightMode ? "#8e8e8e" : C.meta, letterSpacing: "0.04em" }}>drag to reorder</div>
          {onBatchImport && (
            <label className="no-print" title="Batch import images — fills posts in order" style={{ background: lightMode ? "#111" : C.canvas, color: lightMode ? "#fff" : C.accent, border: "none", borderRadius: 5, fontSize: 8, fontWeight: 700, padding: "3px 7px", cursor: "pointer", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
              + Batch Import
              <input type="file" accept="image/*" multiple onChange={e => { onBatchImport(e.target.files); e.target.value = ""; }} style={{ display: "none" }} />
            </label>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, flex: 1, minHeight: 0, overflow: "hidden", alignContent: "start" }}>
        {cells.map((post, i) => {
          const isPinned = post && post.pinned;
          const isTarget = hoverTarget === i && dragSrc !== null && post !== null && !isPinned;
          // Show pin button only on the next available top slot
          const showPinBtn = i === pinnedCount && pinnedCount < 3 && i < 3;
          const showUnpinBtn = isPinned && i === pinnedCount - 1;
          return (
            <div
              key={i}
              draggable={!!post && !isPinned}
              onDragStart={() => post && !isPinned && setDragSrc({ day: post.day, postIdx: post.postIdx ?? 0, cellIdx: i })}
              onDragOver={e => { e.preventDefault(); if (post && !isPinned) setHoverTarget(i); }}
              onDragLeave={() => setHoverTarget(null)}
              onDrop={e => {
                e.preventDefault();
                setHoverTarget(null);
                if (!dragSrc || !post || isPinned) return;
                if (dragSrc.day === post.day && dragSrc.postIdx === (post.postIdx ?? 0)) return;
                onSwap(dragSrc.day, dragSrc.postIdx, post.day, post.postIdx ?? 0);
                setDragSrc(null);
              }}
              onDragEnd={() => { setDragSrc(null); setHoverTarget(null); }}
              style={{
                aspectRatio: "4 / 5", borderRadius: 0, overflow: "hidden",
                cursor: isPinned ? "default" : post ? "grab" : "default",
                outline: isTarget ? `2px solid ${C.accent}` : "none",
                opacity: dragSrc && dragSrc.cellIdx === i ? 0.5 : 1,
                transition: "outline 0.1s, opacity 0.1s",
                position: "relative",
                background: isPinned ? (lightMode ? "#f5f5f5" : C.canvas) : (lightMode ? "#efefef" : C.surface2),
              }}
            >
              {isPinned ? (
                <>
                  {/* Pinned cell — dark overlay with pin icon */}
                  <div style={{ width: "100%", height: "100%", background: lightMode ? "linear-gradient(135deg, #f5f5f5 60%, #efefef)" : `linear-gradient(135deg, ${C.canvas} 60%, ${C.surface})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <span style={{ fontSize: 14 }}>📌</span>
                    <span style={{ fontSize: 6, color: C.accent, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Pinned</span>
                  </div>
                  {showUnpinBtn && (
                    <button
                      onClick={() => setPinnedCount(c => c - 1)}
                      title="Unpin"
                      style={{ position: "absolute", top: 3, right: 3, background: "rgba(232,0,28,0.85)", border: "none", color: C.text, borderRadius: "50%", width: 14, height: 14, fontSize: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, lineHeight: 1 }}
                    >✕</button>
                  )}
                </>
              ) : post?.imageUrls?.[0] ? (
                <>
                  <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${post.imageUrls[0]})`, backgroundSize: getSlideScale(post, 0) <= 1.05 ? "cover" : `${getSlideScale(post, 0) * 100}%`, backgroundPosition: `${getSlideCropX(post, 0)}% ${getSlideCropY(post, 0)}%`, backgroundRepeat: "no-repeat", pointerEvents: "none" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.55)", color: C.text, fontSize: 7, padding: "2px 3px", textAlign: "center", fontWeight: 700, opacity: isTarget ? 1 : 0, transition: "opacity 0.15s" }}>
                    {formatDate(post.day ? new Date().getMonth() : 0, post.day)}
                  </div>
                </>
              ) : (
                <div style={{ width: "100%", height: "100%", background: lightMode ? "#efefef" : C.surface2 }} />
              )}
              {/* Pin button — only on next available slot */}
              {showPinBtn && (
                <button
                  onClick={() => setPinnedCount(c => c + 1)}
                  title="Pin this slot"
                  className="no-print"
                  style={{ position: "absolute", top: 3, left: 3, background: C.surface, border: `1px solid rgba(204,255,0,0.4)`, color: C.accent, borderRadius: 4, fontSize: 8, fontWeight: 800, padding: "2px 5px", cursor: "pointer", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 3, lineHeight: 1.4 }}
                >
                  📌 Pin
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
