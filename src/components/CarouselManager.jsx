import { useState } from "react";
import { C, SANS } from "../theme";

export default function CarouselManager({ imageUrls, urls, onReorder, onRemove, onUrlChange }) {
  const [dragSrc, setDragSrc] = useState(null);
  const [expanded, setExpanded] = useState(false);

  function handleDrop(targetIdx) {
    if (dragSrc === null || dragSrc === targetIdx) return;
    const newImages = [...imageUrls];
    const newUrls = [...urls];
    const [movedImg] = newImages.splice(dragSrc, 1);
    const [movedUrl] = newUrls.splice(dragSrc, 1);
    newImages.splice(targetIdx, 0, movedImg);
    newUrls.splice(targetIdx, 0, movedUrl || "");
    onReorder(newImages, newUrls);
    setDragSrc(null);
  }

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Draggable thumbnail strip */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
        {imageUrls.map((url, imgIdx) => (
          <div
            key={imgIdx}
            draggable
            onDragStart={() => setDragSrc(imgIdx)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(imgIdx)}
            onDragEnd={() => setDragSrc(null)}
            style={{
              position: "relative", width: 60, height: 60,
              cursor: "grab", opacity: dragSrc === imgIdx ? 0.4 : 1,
              outline: dragSrc !== null && dragSrc !== imgIdx ? `2px dashed ${C.border}` : "none",
              borderRadius: 5, transition: "opacity 0.1s",
            }}
          >
            <img src={url} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 5, pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: 2, left: 2, background: "rgba(0,0,0,0.55)", color: C.text, fontSize: 8, borderRadius: 3, padding: "1px 4px", pointerEvents: "none" }}>{imgIdx + 1}</div>
            <button onClick={() => onRemove(imgIdx)} style={{ position: "absolute", top: -4, right: -4, background: C.surface, color: C.text, border: "none", borderRadius: "50%", width: 16, height: 16, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        ))}
      </div>
      {/* Expandable per-slide links */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, color: C.meta, cursor: "pointer", padding: "4px 10px", fontFamily: SANS, width: "100%", textAlign: "left" }}
      >
        {expanded ? "▾" : "▸"} Links per slide ({imageUrls.length})
      </button>
      {expanded && (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5 }}>
          {imageUrls.map((_, imgIdx) => (
            <div key={imgIdx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: C.meta, fontWeight: 700, minWidth: 16 }}>{imgIdx + 1}</span>
              <input
                value={urls[imgIdx] || ""}
                placeholder={`Slide ${imgIdx + 1} link...`}
                onChange={e => onUrlChange(imgIdx, e.target.value)}
                style={{ flex: 1, padding: "5px 8px", border: `1.5px solid ${C.border}`, borderRadius: 5, fontSize: 11, outline: "none", fontFamily: SANS, background: C.canvas, color: C.text }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
