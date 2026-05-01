import { useState } from "react";
import { getSlideCropX, getSlideCropY, getSlideScale } from "../utils";
import { C, MONO } from "../theme";
import { MONTHS } from "../constants";

// Continuous 3-column grid that stitches a working (editable) section on top
// with read-only history sections (one per prior calendar) below — no borders
// or gaps between sections so the months emulate a single seamless Instagram
// feed when expanded. Per-month chevrons collapse a section to a single thin
// strip so the user can hide older months without losing place.
//
// Props:
//   workingPosts: post[] (editable, draggable, reversed for IG-style ordering)
//   history: [{ calendarId, month, year, posts: post[] }] (newest first)
//   collapsed: { [calendarId]: bool }
//   onCollapseToggle: (calendarId) => void
//   onSwap: (dayA, postIdxA, dayB, postIdxB) => void   // working area only
export default function MultiMonthFeedGrid({
  workingPosts = [],
  history = [],
  collapsed = {},
  onCollapseToggle = () => {},
  onSwap = () => {},
}) {
  const [dragSrc, setDragSrc] = useState(null);
  const [hoverTarget, setHoverTarget] = useState(null);

  // Working section: filter to posts with images, reverse so newest sits at the
  // bottom-right (matches ReorderFeedGrid behavior), pad to a full row of 3.
  const workingFiltered = workingPosts.filter(p => p?.imageUrls?.[0]);
  const workingReversed = [...workingFiltered].reverse();
  const workingPad = workingReversed.length % 3 === 0 ? 0 : 3 - (workingReversed.length % 3);
  const workingCells = [...workingReversed, ...Array(workingPad).fill(null)];

  // Build the flat cell stream. Each cell carries metadata so render can place
  // a floating month marker at the start of each prior section, and collapsed
  // months render as a single full-width strip occupying one grid row.
  const stream = workingCells.map((post, idx) => ({
    kind: "working",
    post,
    cellIdx: idx,
  }));

  history.forEach(snap => {
    const isCollapsed = !!collapsed[snap.calendarId];
    if (isCollapsed) {
      stream.push({ kind: "collapsedStrip", snap });
      return;
    }
    const filtered = (snap.posts || []).filter(p => p?.imageUrls?.[0]);
    const padCount = filtered.length % 3 === 0 ? 0 : 3 - (filtered.length % 3);
    const cells = [...filtered, ...Array(padCount).fill(null)];
    cells.forEach((post, idx) => {
      stream.push({
        kind: "history",
        post,
        snap,
        isFirstInSection: idx === 0,
      });
    });
  });

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

        if (item.kind === "working") {
          const { post, cellIdx } = item;
          const isTarget = hoverTarget === cellIdx && dragSrc !== null && post !== null;
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
              style={cellStyle(post, isTarget, dragSrc?.cellIdx === cellIdx, true)}
            >
              {renderCellContent(post)}
            </div>
          );
        }

        // history cell
        const { post, snap, isFirstInSection } = item;
        return (
          <div
            key={`h-${snap.calendarId}-${i}`}
            style={cellStyle(post, false, false, false)}
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

function cellStyle(post, isTarget, isDragging, draggable) {
  return {
    aspectRatio: "4 / 5",
    overflow: "hidden",
    position: "relative",
    cursor: draggable ? (post ? "grab" : "default") : "default",
    outline: isTarget ? `2px solid ${C.accent}` : "none",
    opacity: isDragging ? 0.5 : 1,
    transition: "outline 0.1s, opacity 0.1s",
    background: "#efefef",
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
