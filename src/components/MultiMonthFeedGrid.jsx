import { useState } from "react";
import { getSlideCropX, getSlideCropY, getSlideScale } from "../utils";
import { C, MONO } from "../theme";
import { MONTHS } from "../constants";

// Continuous 3-column grid that emulates a real Instagram profile feed:
// pinned slots at the top-left, the current ("working") month flowing into
// prior months without artificial row breaks, and a single trailing pad at
// the very bottom. Each prior month gets a floating month chip overlaid on
// its first visible cell (which can land mid-row so the seam is invisible).
// Collapsed months still render as a full-width strip — that's an explicit
// user action, so the row break is intentional.
//
// Props:
//   workingPosts:    post[]                                            (editable, draggable; rendered IG-newest-first)
//   history:         [{ calendarId, month, year, posts: post[] }]     (newest first)
//   collapsed:       { [calendarId]: bool }
//   onCollapseToggle:(calendarId) => void
//   onSwap:          (dayA, postIdxA, dayB, postIdxB) => void          (working area only)
//   pinnedCount:     number                                            (0–3)
//   setPinnedCount:  (n|fn) => void                                    (omit for read-only)
export default function MultiMonthFeedGrid({
  workingPosts = [],
  history = [],
  collapsed = {},
  onCollapseToggle = () => {},
  onSwap = () => {},
  pinnedCount = 0,
  setPinnedCount,
}) {
  const [dragSrc, setDragSrc] = useState(null);
  const [hoverTarget, setHoverTarget] = useState(null);

  const pinEditable = typeof setPinnedCount === "function";

  // Build a single flat cell stream. Each item carries enough metadata for
  // the renderer to decide what overlays/handlers it needs.
  const stream = [];

  // 1) Pinned placeholder slots (top-left, max 3).
  for (let i = 0; i < pinnedCount; i++) {
    stream.push({ kind: "pinned", idx: i });
  }

  // 2) Working month — filter to posts with images, reverse so newest sits at
  //    the top-left of the working section.
  const workingFiltered = workingPosts.filter(p => p?.imageUrls?.[0]);
  const workingReversed = [...workingFiltered].reverse();
  workingReversed.forEach((post, idx) => {
    stream.push({ kind: "working", post, cellIdx: idx });
  });

  // 3) History months (newest → oldest). No per-section padding; just flow.
  //    Reversed within each month so the first visible cell of the section is
  //    the month's newest post (matches IG ordering across the seam).
  history.forEach(snap => {
    if (collapsed[snap.calendarId]) {
      stream.push({ kind: "collapsedStrip", snap });
      return;
    }
    const filtered = (snap.posts || []).filter(p => p?.imageUrls?.[0]);
    const reversed = [...filtered].reverse();
    reversed.forEach((post, idx) => {
      stream.push({
        kind: "history",
        post,
        snap,
        isFirstInSection: idx === 0,
      });
    });
  });

  // 4) Final trailing pad — only after the last actual cell. Collapsed strips
  //    are full-width and don't need padding to round out a row.
  const lastIsStrip = stream.length > 0 && stream[stream.length - 1].kind === "collapsedStrip";
  if (!lastIsStrip) {
    // Count grid cells excluding strips (strips occupy a full row anyway).
    const cellCount = stream.filter(c => c.kind !== "collapsedStrip").length;
    const pad = cellCount % 3 === 0 ? 0 : 3 - (cellCount % 3);
    for (let i = 0; i < pad; i++) stream.push({ kind: "blank", idx: i });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, width: "100%" }}>
      {stream.map((item, i) => {
        if (item.kind === "collapsedStrip") {
          const { snap } = item;
          return (
            <button
              key={`collapsed-${snap.calendarId}`}
              onClick={() => onCollapseToggle(snap.calendarId)}
              style={{
                gridColumn: "1 / -1",
                background: "#fafafa",
                border: "none",
                borderTop: "1px solid #ececec",
                padding: "11px 14px",
                fontFamily: MONO,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "1.6px",
                textTransform: "uppercase",
                color: "#8e8e8e",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
              title="Show this month"
            >
              <span>{MONTHS[snap.month]} {snap.year}</span>
              <span style={{ fontSize: 11 }}>▾</span>
            </button>
          );
        }

        if (item.kind === "pinned") {
          const isLastPin = item.idx === pinnedCount - 1;
          return (
            <div key={`pin-${item.idx}`} style={cellStyle(null, false, false, false, true)}>
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #f5f5f5 60%, #efefef)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <span style={{ fontSize: 14 }}>📌</span>
                <span style={{ fontSize: 6, color: C.accent, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Pinned</span>
              </div>
              {pinEditable && isLastPin && (
                <button
                  onClick={() => setPinnedCount(c => c - 1)}
                  title="Unpin"
                  style={{ position: "absolute", top: 3, right: 3, background: "rgba(232,0,28,0.85)", border: "none", color: "#fff", borderRadius: "50%", width: 14, height: 14, fontSize: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, lineHeight: 1 }}
                >✕</button>
              )}
            </div>
          );
        }

        if (item.kind === "blank") {
          return <div key={`blank-${item.idx}`} style={cellStyle(null, false, false, false, false)} />;
        }

        if (item.kind === "working") {
          const { post, cellIdx } = item;
          const isTarget = hoverTarget === cellIdx && dragSrc !== null && post !== null;
          // Pin button on the next available top-row slot, only when there's
          // room left for another pin and we're not already at column 4+.
          const showPinBtn = pinEditable && pinnedCount < 3 && i === pinnedCount && i < 3;
          return (
            <div
              key={`w-${cellIdx}`}
              draggable={!!post}
              onDragStart={() => post && setDragSrc({ day: post.day, postIdx: post.postIdx ?? 0, cellIdx })}
              onDragOver={e => { e.preventDefault(); if (post) setHoverTarget(cellIdx); }}
              onDragLeave={() => setHoverTarget(null)}
              onDrop={e => {
                e.preventDefault();
                setHoverTarget(null);
                if (!dragSrc || !post) return;
                if (dragSrc.day === post.day && dragSrc.postIdx === (post.postIdx ?? 0)) return;
                onSwap(dragSrc.day, dragSrc.postIdx, post.day, post.postIdx ?? 0);
                setDragSrc(null);
              }}
              onDragEnd={() => { setDragSrc(null); setHoverTarget(null); }}
              style={cellStyle(post, isTarget, dragSrc?.cellIdx === cellIdx, true, false)}
            >
              {renderCellContent(post)}
              {showPinBtn && (
                <button
                  onClick={() => setPinnedCount(c => c + 1)}
                  title="Pin this slot"
                  className="no-print"
                  style={{ position: "absolute", top: 3, left: 3, background: "#fff", border: `1px solid rgba(204,255,0,0.55)`, color: C.accent, borderRadius: 4, fontSize: 8, fontWeight: 800, padding: "2px 5px", cursor: "pointer", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 3, lineHeight: 1.4, zIndex: 6 }}
                >
                  📌 Pin
                </button>
              )}
            </div>
          );
        }

        // history cell
        const { post, snap, isFirstInSection } = item;
        return (
          <div
            key={`h-${snap.calendarId}-${i}`}
            style={cellStyle(post, false, false, false, false)}
          >
            {renderCellContent(post)}
            {isFirstInSection && (
              <button
                onClick={() => onCollapseToggle(snap.calendarId)}
                title="Hide this month"
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(255,255,255,0.85)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  color: "#333",
                  borderRadius: 12,
                  padding: "4px 9px",
                  fontFamily: MONO,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "1.2px",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  backdropFilter: "blur(4px)",
                  zIndex: 5,
                  lineHeight: 1,
                }}
              >
                <span>{MONTHS[snap.month].slice(0, 3)} {snap.year}</span>
                <span style={{ fontSize: 10 }}>▴</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function cellStyle(post, isTarget, isDragging, draggable, isPinned) {
  return {
    aspectRatio: "4 / 5",
    overflow: "hidden",
    position: "relative",
    cursor: draggable ? (post ? "grab" : "default") : "default",
    outline: isTarget ? `2px solid ${C.accent}` : "none",
    opacity: isDragging ? 0.5 : 1,
    transition: "outline 0.1s, opacity 0.1s",
    background: isPinned ? "#f5f5f5" : "#efefef",
  };
}

function renderCellContent(post) {
  if (!post?.imageUrls?.[0]) {
    return <div style={{ width: "100%", height: "100%", background: "#efefef" }} />;
  }
  const scale = getSlideScale(post, 0);
  const cropX = getSlideCropX(post, 0);
  const cropY = getSlideCropY(post, 0);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `url(${post.imageUrls[0]})`,
        backgroundSize: scale <= 1.05 ? "cover" : `${scale * 100}%`,
        backgroundPosition: `${cropX}% ${cropY}%`,
        backgroundRepeat: "no-repeat",
        pointerEvents: "none",
      }}
    />
  );
}
