export default function DropZone({ isDropTarget, label, onDragOver, onDragLeave, onDrop, onFileInput, urlValue, onUrlChange, compact }) {
  return (
    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} style={{ border: `2px dashed ${isDropTarget ? "#1a1a2e" : "#e0e0e0"}`, borderRadius: 7, background: isDropTarget ? "#f0f4ff" : "#fafafa", transition: "all 0.15s", overflow: "hidden", padding: compact ? "8px 10px" : "14px 12px" }}>
      <label style={{ display: "block", cursor: "pointer", textAlign: "center" }}>
        {!compact && <div style={{ fontSize: 22, marginBottom: 4 }}>🖼</div>}
        <div style={{ fontSize: compact ? 11 : 12, color: isDropTarget ? "#1a1a2e" : "#aaa", fontWeight: 600, marginBottom: compact ? 4 : 2 }}>{isDropTarget ? "Drop it!" : label}</div>
        {!compact && <div style={{ fontSize: 11, color: "#ccc", marginBottom: 8 }}>or click to browse files</div>}
        <input type="file" accept="image/*" multiple onChange={onFileInput} style={{ display: "none" }} />
        <span style={{ display: "inline-block", background: "#1a1a2e", color: "#D7FA06", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, cursor: "pointer" }}>Browse</span>
      </label>
      {onUrlChange && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#eee" }} />
            <span style={{ fontSize: 10, color: "#ccc" }}>or paste a URL</span>
            <div style={{ flex: 1, height: 1, background: "#eee" }} />
          </div>
          <input value={urlValue || ""} placeholder="https://drive.google.com/..." onChange={e => onUrlChange(e.target.value)} style={{ width: "100%", padding: "7px 10px", border: "1.5px solid #e0e0e0", borderRadius: 6, fontSize: 11, outline: "none", fontFamily: "inherit", background: "white", color: "#111" }} />
        </>
      )}
    </div>
  );
}
