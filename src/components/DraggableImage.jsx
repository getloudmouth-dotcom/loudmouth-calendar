import { useState } from "react";

export default function DraggableImage({ src, cropX, cropY, scale, onUpdate, isCarousel, isVideo, placeholder }) {
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState(null);
  const [startCrop, setStartCrop] = useState(null);

  function onMouseDown(e) {
    if (!src) return;
    e.preventDefault();
    setDragging(true);
    setStart({ x: e.clientX, y: e.clientY });
    setStartCrop({ x: cropX, y: cropY });
  }
  function onMouseMove(e) {
    if (!dragging || !start) return;
    const dx = ((e.clientX - start.x) / 200) * -100;
    const dy = ((e.clientY - start.y) / 200) * -100;
    onUpdate("cropX", Math.min(100, Math.max(0, startCrop.x + dx)));
    onUpdate("cropY", Math.min(100, Math.max(0, startCrop.y + dy)));
  }
  function onMouseUp() { setDragging(false); setStart(null); }

  return (
    <div onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} style={{
      aspectRatio: "4 / 5", background: "#efefef", borderRadius: 8, overflow: "hidden", position: "relative",
      cursor: src ? (dragging ? "grabbing" : "grab") : "default", userSelect: "none",
    }}>
      {src ? (
        <>
          <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${src})`, backgroundSize: (scale ?? 1) <= 1.05 ? "cover" : `${(scale ?? 1) * 100}%`, backgroundPosition: `${cropX ?? 50}% ${cropY ?? 50}%`, backgroundRepeat: "no-repeat", pointerEvents: "none" }} />

        </>
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#bbb", gap: 6, position: "relative", background: "#f5f5f5" }}>
          <span style={{ fontSize: 28 }}>{isCarousel ? "🎠" : isVideo ? "🎬" : "🖼"}</span>
          <span style={{ fontSize: 11 }}>{isCarousel ? "Carousel" : "No image"}</span>
          {placeholder && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.6)" }}>
              <div style={{ background: "#FFF9C4", border: "1px solid #F0E060", borderRadius: 6, padding: "10px 14px", maxWidth: "80%", fontSize: 12, color: "#555", fontWeight: 600, textAlign: "center", boxShadow: "2px 3px 10px rgba(0,0,0,0.12)", transform: "rotate(-1deg)" }}>
                📝 {placeholder}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
