import { useState } from "react";
import { getSlideCropX, getSlideCropY, getSlideScale, formatDate } from "../utils";

export default function ReorderFeedGrid({ allPosts, onSwap, onBatchImport, onDriveBatchImport, driveUploadProgress, pinnedCount, setPinnedCount }) {
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
    style={{ border: `1.5px solid ${dropHighlight ? "#1a1a2e" : "#e8e8e8"}`, borderRadius: 10, padding: "12px 14px", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box", background: dropHighlight ? "#f4f4ff" : "white", transition: "border-color 0.15s, background 0.15s", position: "relative" }}
      onDragOver={e => { const types = [...e.dataTransfer.types].map(t => t.toLowerCase()); if (types.includes("files") || types.includes("drivefileids")) { e.preventDefault(); setDropHighlight(true); } }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDropHighlight(false); }}
      onDrop={e => { e.preventDefault(); setDropHighlight(false); const raw = e.dataTransfer.getData("driveFileIds"); if (raw && onDriveBatchImport) { onDriveBatchImport(JSON.parse(raw)); } else if (e.dataTransfer.files.length && onBatchImport) { onBatchImport(e.dataTransfer.files); } }}
    >
      {driveUploadProgress && driveUploadProgress.active && driveUploadProgress.day === null && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.88)", borderRadius: 10, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, border: "3.5px solid #e8e8e8", borderTop: "3.5px solid #1a1a2e", borderRadius: "50%", animation: "cardSpin 0.75s linear infinite" }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.06em" }}>
            {driveUploadProgress.total > 1 ? `${driveUploadProgress.done} / ${driveUploadProgress.total} UPLOADING` : "UPLOADING..."}
          </span>
        </div>
      )}
      <div className="feed-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <div className="feed-label" style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>Feed:</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="no-print" style={{ fontSize: 9, color: "#bbb", letterSpacing: "0.04em" }}>drag to reorder</div>
          {onBatchImport && (
            <label className="no-print" title="Batch import images — fills posts in order" style={{ background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 5, fontSize: 8, fontWeight: 700, padding: "3px 7px", cursor: "pointer", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
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
                outline: isTarget ? "2px solid #1a1a2e" : "none",
                opacity: dragSrc && dragSrc.cellIdx === i ? 0.5 : 1,
                transition: "outline 0.1s, opacity 0.1s",
                position: "relative",
                background: isPinned ? "#1a1a2e" : "#eeeeee",
              }}
            >
              {isPinned ? (
                <>
                  {/* Pinned cell — dark overlay with pin icon */}
                  <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #1a1a2e 60%, #2a2a4e)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <span style={{ fontSize: 14 }}>📌</span>
                    <span style={{ fontSize: 6, color: "rgba(215,250,6,0.7)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Pinned</span>
                  </div>
                  {showUnpinBtn && (
                    <button
                      onClick={() => setPinnedCount(c => c - 1)}
                      title="Unpin"
                      style={{ position: "absolute", top: 3, right: 3, background: "rgba(232,0,28,0.85)", border: "none", color: "white", borderRadius: "50%", width: 14, height: 14, fontSize: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, lineHeight: 1 }}
                    >✕</button>
                  )}
                </>
              ) : post?.imageUrls?.[0] ? (
                <>
                  <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${post.imageUrls[0]})`, backgroundSize: getSlideScale(post, 0) <= 1.05 ? "cover" : `${getSlideScale(post, 0) * 100}%`, backgroundPosition: `${getSlideCropX(post, 0)}% ${getSlideCropY(post, 0)}%`, backgroundRepeat: "no-repeat", pointerEvents: "none" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.55)", color: "white", fontSize: 7, padding: "2px 3px", textAlign: "center", fontWeight: 700, opacity: isTarget ? 1 : 0, transition: "opacity 0.15s" }}>
                    {formatDate(post.day ? new Date().getMonth() : 0, post.day)}
                  </div>
                </>
              ) : (
                <div style={{ width: "100%", height: "100%", background: i % 3 === 0 ? "#e5e5e5" : i % 3 === 1 ? "#ebebeb" : "#e8e8e8" }} />
              )}
              {/* Pin button — only on next available slot */}
              {showPinBtn && (
                <button
                  onClick={() => setPinnedCount(c => c + 1)}
                  title="Pin this slot"
                  className="no-print"
                  style={{ position: "absolute", top: 3, left: 3, background: "rgba(26,26,46,0.82)", border: "1px solid rgba(215,250,6,0.4)", color: "#D7FA06", borderRadius: 4, fontSize: 8, fontWeight: 800, padding: "2px 5px", cursor: "pointer", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 3, lineHeight: 1.4 }}
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
