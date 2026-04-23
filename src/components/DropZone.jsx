import { C, SANS } from "../theme";

export default function DropZone({ isDropTarget, label, onDragOver, onDragLeave, onDrop, onFileInput, urlValue, onUrlChange, compact }) {
  return (
    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} style={{ border: `2px dashed ${isDropTarget ? C.accent : C.border}`, borderRadius: 7, background: isDropTarget ? C.surface2 : C.surface, transition: "all 0.15s", overflow: "hidden", padding: compact ? "8px 10px" : "14px 12px" }}>
      <label style={{ display: "block", cursor: "pointer", textAlign: "center" }}>
        {!compact && <div style={{ fontSize: 22, marginBottom: 4 }}>🖼</div>}
        <div style={{ fontSize: compact ? 11 : 12, color: isDropTarget ? C.text : C.meta, fontWeight: 600, marginBottom: compact ? 4 : 2 }}>{isDropTarget ? "Drop it!" : label}</div>
        {!compact && <div style={{ fontSize: 11, color: C.meta, marginBottom: 8 }}>or click to browse files</div>}
        <input type="file" accept="image/*" multiple onChange={onFileInput} style={{ display: "none" }} />
        <span style={{ display: "inline-block", background: C.canvas, color: C.accent, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, cursor: "pointer" }}>Browse</span>
      </label>
      {onUrlChange && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 10, color: C.meta }}>or paste a URL</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <input value={urlValue || ""} placeholder="https://drive.google.com/..." onChange={e => onUrlChange(e.target.value)} style={{ width: "100%", padding: "7px 10px", border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: 11, outline: "none", fontFamily: SANS, background: C.canvas, color: C.text }} />
        </>
      )}
    </div>
  );
}
