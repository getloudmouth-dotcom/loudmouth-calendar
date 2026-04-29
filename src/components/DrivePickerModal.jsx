import { useState } from "react";
import { uploadToCloudinary } from "../utils";

export default function DrivePickerModal({ apiKey, onSelect, onClose }) {
  const [folderUrl, setFolderUrl] = useState(() => localStorage.getItem("lm_driveFolder") || "");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [adding, setAdding] = useState(false);

  function extractFolderId(url) {
    const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : url.trim();
  }

  async function loadFolder() {
    const folderId = extractFolderId(folderUrl);
    if (!folderId) return;
    localStorage.setItem("lm_driveFolder", folderUrl);
    setLoading(true); setError(""); setFiles([]);
    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=%27${folderId}%27+in+parents+and+mimeType+contains+%27image%2F%27&fields=files(id,name,mimeType)&key=${apiKey}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setFiles(data.files || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleSelect(file) {
    if (selected?.id === file.id) return;
    setSelected(file); setPreviewing(null);
    try {
      const r = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${apiKey}`);
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreviewing(blobUrl);
    } catch { setPreviewing("error"); }
  }

  async function handleAdd() {
    if (!selected) return;
    setAdding(true);
    try {
      let blob;
      if (!previewing || previewing === "error") {
        const r = await fetch(`https://www.googleapis.com/drive/v3/files/${selected.id}?alt=media&key=${apiKey}`);
        blob = await r.blob();
      } else {
        const r = await fetch(previewing);
        blob = await r.blob();
      }
      const url = await uploadToCloudinary(blob);
      onSelect(url);
      onClose();
    } catch { alert("Failed to upload image"); }
    setAdding(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "white", borderRadius: 14, width: 680, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>📁 Pick from Google Drive</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#767676", lineHeight: 1 }}>✕</button>
        </div>

        {/* Folder input */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", gap: 8 }}>
          <input value={folderUrl} onChange={e => setFolderUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && loadFolder()}
            placeholder="Paste Drive folder link..."
            style={{ flex: 1, padding: "8px 12px", border: "1.5px solid #e0e0e0", borderRadius: 7, fontSize: 13, outline: "none", fontFamily: "inherit", color: "#333" }} />
          <button onClick={loadFolder} disabled={loading} style={{ background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 700, padding: "8px 18px", cursor: "pointer" }}>
            {loading ? "Loading..." : "Load"}
          </button>
        </div>

        {error && <div style={{ padding: "8px 20px", fontSize: 12, color: "#E8001C" }}>{error}</div>}

        {/* Content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* File grid */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, alignContent: "start" }}>
            {files.length === 0 && !loading && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#bbb", fontSize: 13, padding: "40px 0" }}>
                {folderUrl ? "No images found" : "Paste a folder link above to browse"}
              </div>
            )}
            {files.map(file => {
              const isSelected = selected?.id === file.id;
              return (
                <div key={file.id} onClick={() => handleSelect(file)}
                  style={{ aspectRatio: "1", borderRadius: 8, border: `2px solid ${isSelected ? "#1a1a2e" : "#e8e8e8"}`, background: isSelected ? "#f0f4ff" : "#f8f8f8",
                    cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    overflow: "hidden", transition: "border-color 0.15s", position: "relative" }}>
                  {isSelected && previewing && previewing !== "error" ? (
                    <img src={previewing} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{isSelected && !previewing ? "⏳" : "🖼"}</div>
                      <div style={{ fontSize: 9, color: "#888", textAlign: "center", padding: "0 6px", lineHeight: 1.3, wordBreak: "break-word" }}>
                        {file.name.replace(/\.[^.]+$/, "").slice(0, 24)}
                      </div>
                    </>
                  )}
                  {isSelected && <div style={{ position: "absolute", top: 4, right: 4, background: "#1a1a2e", color: "#D7FA06", borderRadius: "50%", width: 18, height: 18, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</div>}
                </div>
              );
            })}
          </div>

          {/* Preview pane */}
          {selected && (
            <div style={{ width: 200, borderLeft: "1px solid #eee", padding: 16, display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#333" }}>Preview</div>
              <div style={{ aspectRatio: "4/5", background: "#f0f0f0", borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {!previewing && <span style={{ fontSize: 24 }}>⏳</span>}
                {previewing === "error" && <span style={{ fontSize: 12, color: "#767676" }}>Failed</span>}
                {previewing && previewing !== "error" && <img src={previewing} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
              <div style={{ fontSize: 10, color: "#888", wordBreak: "break-word" }}>{selected.name}</div>
              <button onClick={handleAdd} disabled={!previewing || previewing === "error" || adding}
                style={{ background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 700, padding: "10px 0", cursor: "pointer", opacity: (!previewing || previewing === "error" || adding) ? 0.5 : 1 }}>
                {adding ? "Adding..." : "Add to Post"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
