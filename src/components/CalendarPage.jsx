import { useState } from "react";
import { compressToBlob, uploadToCloudinary } from "../utils";
import { MONTHS } from "../constants";
import { DISP, SANS } from "../theme";
import PostCard from "./PostCard";
import ReorderFeedGrid from "./ReorderFeedGrid";
export default function CalendarPage({ posts, allPosts, feedPosts, clientName, month, year, onUpdatePost, onSwapPosts, onBatchImport, onDriveBatchImport, postsPerPage, exporting, builderName, driveUploadProgress, onDriveDrop, onFilesDrop, pinnedCount, setPinnedCount, onPickReelLink, notes = "", onNotesChange, notesImage = "", onNotesImageChange, driveToken = "" }) {
  const [notesDragOver, setNotesDragOver] = useState(false);
  const feedGridPosts = feedPosts || allPosts.filter(p => p.contentType !== "Story");

  async function handleNotesImageDrop(file) {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const blob = await compressToBlob(file);
      const url = await uploadToCloudinary(blob);
      onNotesImageChange(url);
    } catch { /* silent */ }
  }

  async function handleNotesDriveDrop(fileId) {
    if (!driveToken || !fileId) return;
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: { Authorization: `Bearer ${driveToken}` } });
      if (!res.ok) throw new Error("Drive fetch failed");
      const blob = await res.blob();
      const compressed = await compressToBlob(new File([blob], "drive-img.jpg", { type: blob.type }));
      const url = await uploadToCloudinary(compressed);
      onNotesImageChange(url);
    } catch { /* silent */ }
  }
  return (
    <div className="cal-page" style={{ background: "white", borderRadius: 0, boxShadow: "none", padding: `${postsPerPage > 2 ? 28 : 40}px ${postsPerPage > 2 ? 40 : 56}px`, marginBottom: 0, border: "1px solid #e8e8e8", aspectRatio: "1.41 / 1", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, borderBottom: "1px solid #eee", paddingBottom: 8, flexShrink: 0 }}>
        <h1 style={{ fontFamily: DISP, fontWeight: 400, fontSize: postsPerPage > 3 ? 22 : postsPerPage > 2 ? 26 : 32, color: "#111", lineHeight: 1, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {MONTHS[month]} {year}
          <span style={{ fontFamily: SANS, fontStyle: "italic", fontWeight: 400, fontSize: "0.55em", color: "#666", marginLeft: 12, letterSpacing: 0, textTransform: "none" }}>| Content Calendar</span>
        </h1>
        <h2 style={{ fontFamily: DISP, fontWeight: 400, fontSize: postsPerPage > 3 ? 20 : postsPerPage > 2 ? 24 : 30, color: "#222", textTransform: "uppercase", letterSpacing: 0.5 }}>{clientName}</h2>
      </div>
      <div style={{ display: "flex", gap: 20, alignItems: "stretch", flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, display: "flex", gap: 18, alignItems: "stretch", minHeight: 0 }}>
          {posts.map((post, i) => (
            <div key={i} style={{ flex: "0 0 auto", width: `calc((100% - ${(postsPerPage - 1) * 18}px) / ${postsPerPage})`, display: "flex" }}>
            <PostCard post={post} month={month} year={year} onUpdate={(field, val) => onUpdatePost(post.day, post.postIdx ?? i, field, val)} isExporting={exporting} onDriveDrop={onDriveDrop ? (fileInfos) => onDriveDrop(post.day, post.postIdx ?? i, fileInfos) : undefined} onFilesDrop={onFilesDrop ? (files) => onFilesDrop(post.day, post.postIdx ?? i, files) : undefined} driveUploadProgress={driveUploadProgress} onPickReelLink={onPickReelLink ? () => onPickReelLink(post.day, post.postIdx ?? i) : undefined} />
          </div>
          ))}
          {/* Ghost spacers so partial pages stay the right size */}
          {Array.from({ length: postsPerPage - posts.length }).map((_, i) => (
            <div key={`ghost-${i}`} style={{ flex: "0 0 auto", width: `calc((100% - ${(postsPerPage - 1) * 18}px) / ${postsPerPage})`, visibility: "hidden" }}>
              <div style={{ aspectRatio: "4 / 5", background: "transparent" }} />
            </div>
          ))}
        </div>
        <div style={{ width: 270, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
        <div
            style={{ border: `1.5px solid ${notesDragOver ? "#1a1a2e" : "#e8e8e8"}`, borderRadius: 10, padding: "10px 12px", flexShrink: 0, background: notesDragOver ? "#f4f4ff" : "white", transition: "border-color 0.15s, background 0.15s" }}
            onDragOver={e => { e.preventDefault(); setNotesDragOver(true); }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setNotesDragOver(false); }}
            onDrop={e => {
              e.preventDefault();
              setNotesDragOver(false);
              const driveRaw = e.dataTransfer.getData("driveFileIds");
              if (driveRaw) {
                try {
                  const driveFiles = JSON.parse(driveRaw);
                  if (driveFiles?.[0]?.id) { handleNotesDriveDrop(driveFiles[0].id); return; }
                } catch {}
              }
              const driveFileId = e.dataTransfer.getData("driveFileId");
              if (driveFileId) { handleNotesDriveDrop(driveFileId); return; }
              const file = e.dataTransfer.files?.[0];
              if (file) handleNotesImageDrop(file);
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#333" }}>Notes:</div>
              {notesImage && <button onClick={() => onNotesImageChange("")} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 10, padding: 0 }}>✕ photo</button>}
            </div>
            {notesImage && <img src={notesImage} alt="note" style={{ width: "100%", height: 72, objectFit: "cover", borderRadius: 6, display: "block", marginBottom: 6 }} />}
            <textarea value={notes} onChange={e => onNotesChange(e.target.value)} rows={notesImage ? 2 : 3} placeholder={notesDragOver ? "Drop image here..." : "Add notes or drop a photo..."} style={{ width: "100%", border: "none", outline: "none", resize: "none", fontSize: 12, color: "#444", fontFamily: "inherit", lineHeight: 1.5, background: "transparent", borderRadius: 4, padding: "2px 0" }} />
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <ReorderFeedGrid allPosts={feedGridPosts} onSwap={onSwapPosts} onBatchImport={onBatchImport} onDriveBatchImport={onDriveBatchImport} driveUploadProgress={driveUploadProgress} pinnedCount={pinnedCount} setPinnedCount={setPinnedCount} lightMode />
          </div>
        </div>
      </div>
      <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "baseline", flexShrink: 0 }}>
        {builderName ? (
          <span style={{ fontSize: 8, color: "#bbb", letterSpacing: "0.02em" }}>
            This calendar was custom built for you by <span style={{ fontFamily: "'Dancing Script', cursive", fontSize: 13, color: "#999" }}>{builderName}</span>
          </span>
        ) : <span />}
        <span style={{ fontSize: 8, color: "#ccc", letterSpacing: "0.04em" }}>© 2026 Loudmouth. All rights reserved.</span>
      </div>
    </div>
  );
}
