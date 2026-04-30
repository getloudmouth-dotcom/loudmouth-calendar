import { useState } from "react";
import AppDialog from "../components/AppDialog";
import { useApp } from "../AppContext";
import { MONTHS, CONTENT_TYPES, newPost } from "../constants";
import { getDayName, formatDate } from "../utils";
import { C, SANS, DISP, LABEL as labelStyle, INPUT as inputStyle, primaryBtn, ghostBtn, ghostBtn as secondaryBtn, dangerBtn } from "../theme";
import DatePicker from "../components/DatePicker";
import NavProfileMenu from "../components/NavProfileMenu";
import SaveMenu from "../components/SaveMenu";
import { Toaster } from "@/components/ui/sonner";
import DrivePanel from "../components/DrivePanel";
import CarouselManager from "../components/CarouselManager";
import DropZone from "../components/DropZone";
import CalendarPage from "../components/CalendarPage";
import ReorderFeedGrid from "../components/ReorderFeedGrid";

export default function CalendarBuilder({
  step, setStep, stepLabels,
  clientName, setClientName,
  month, setMonth, year, setYear,
  selectedDays, setSelectedDays, posts, setPosts,
  postsPerPage, setPostsPerPage,
  currentCalendarId,
  allPosts, pages, sortedDays, calendarCells, daysInMonth,
  toggleDay, changeDay, addPostToDay, removePostFromDay, swapPostContent, removeImageFromPost,
  updatePost,
  clients, addingClient, setAddingClient, newClientInput, setNewClientInput, addNewClient,
  canUndo, undo, canRedo, redo, resetCalendar,
  exporting, exportProgress, exportElapsed,
  exportMode,
  saveDraft,
  exportPDF,
  profileName, profileInput, setProfileInput, saveProfile, editingProfile, setEditingProfile,
  showDraftHistory, setShowDraftHistory, draftHistory, restoreDraft, loadDraftHistory,
  wasOffline,
  signOut, realtimeChannelRef, setShowDashboard,
  driveToken, setDriveToken, driveOpen, setDriveOpen, drivePanelWidth, setDrivePanelWidth,
  driveUploadProgress,
  linkPickMode, setLinkPickMode,
  pinnedCount, setPinnedCount,
  calendarNotes, setCalendarNotes, calendarNotesImage, setCalendarNotesImage,
  handleFiles, handleBatchImport, handleDriveFileDrop, handleMultiDriveFileDrop, handleDriveBatchImport,
  connectDrive,
}) {
  const { isOnline, showToast } = useApp();
  const [dragOver, setDragOver] = useState(null);
  const [hoveredPostCard, setHoveredPostCard] = useState(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  return (
<div style={{ fontFamily: SANS, minHeight: "100vh", background: C.canvas }}>

  {/* NAV */}
  <nav className="no-print" style={{ background: C.canvas, padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, gap: 24 }}>
    <div onClick={() => { realtimeChannelRef.current?.unsubscribe(); realtimeChannelRef.current = null; setShowDashboard(true); }} style={{ display: "flex", flexDirection: "column", lineHeight: 1.1, alignItems: "flex-start", flexShrink: 0, cursor: "pointer" }}>
      <span style={{ color: C.accent, fontWeight: 900, fontSize: 16.5, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>LOUDMOUTH HQ</span>
      <span style={{ color: C.meta, fontWeight: 500, fontSize: 10, letterSpacing: "0.08em" }}>by Loudmouth</span>
    </div>
    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
      {stepLabels.map((label, i) => {
        const s = i + 1;
        return (
          <button key={s} data-step-nav onClick={() => { setStep(s); if (s !== 3) setLinkPickMode({ active: false, onPick: null }); if (s === 4) { fetch("/api/export-pdf", { method: "HEAD" }).catch(() => {}); if (clientName.trim() && user) saveDraft("Auto-save on preview", { silent: true }); } }} style={{
            background: step === s ? C.accent : "rgba(255,255,255,0.07)",
            color: step === s ? "#000" : C.meta,
            border: "none", padding: "6px 16px", borderRadius: 20,
            fontSize: 12, cursor: "pointer", fontWeight: 700, transition: "all 0.15s", whiteSpace: "nowrap",
          }}>{s}. {label}</button>
        );
      })}
    </div>
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>

    <button onClick={undo} disabled={!canUndo} title="Undo" aria-label="Undo" style={{ background: "rgba(255,255,255,0.08)", color: canUndo ? C.text : C.meta, border: "none", borderRadius: 7, width: 32, height: 32, fontSize: 15, cursor: canUndo ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>↩</button>
      <button onClick={redo} disabled={!canRedo} title="Redo" aria-label="Redo" style={{ background: "rgba(255,255,255,0.08)", color: canRedo ? C.text : C.meta, border: "none", borderRadius: 7, width: 32, height: 32, fontSize: 15, cursor: canRedo ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>↪</button>
      <button onClick={() => setResetConfirm(true)} title="Reset calendar" aria-label="Reset calendar" style={{ background: "rgba(255,255,255,0.08)", color: C.meta, border: "none", borderRadius: 7, width: 32, height: 32, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⟲</button>
      {clientName && <SaveMenu onSave={() => saveDraft()} onExport={exportPDF} showExport={step === 4} />}
      <NavProfileMenu
        profileName={profileName}
        currentCalendarId={currentCalendarId}
        onMyCalendars={() => { realtimeChannelRef.current?.unsubscribe(); realtimeChannelRef.current = null; setShowDashboard(true); }}
        onHistory={() => { loadDraftHistory(); setShowDraftHistory(true); }}
        onEditProfile={() => { setProfileInput(profileName); setEditingProfile(true); }}
        onSignOut={signOut}
      />
    </div>
    </nav>
    <main>
    {(!isOnline || wasOffline) && (
      <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 99998, display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", background: isOnline ? "rgba(20, 160, 80, 1)" : "#141428", border: isOnline ? "1px solid rgba(100,220,140,0.4)" : "1px solid rgba(232,0,28,0.4)", transition: "background 0.4s, border 0.4s", whiteSpace: "nowrap" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: isOnline ? "#6fec9f" : "#E8001C", boxShadow: isOnline ? "0 0 8px #6fec9f" : "0 0 8px #E8001C", flexShrink: 0, animation: isOnline ? "none" : "offlinePulse 1.4s ease-in-out infinite" }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: "0.02em" }}>
            {isOnline ? "Back online" : "No internet connection"}
          </div>
          <div style={{ fontSize: 11, color: isOnline ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.55)", marginTop: 1 }}>
            {isOnline ? "All good — your work is safe." : "Changes won't save until you reconnect."}
          </div>
        </div>
        {isOnline && <span style={{ fontSize: 16, marginLeft: 2 }}>✓</span>}
      </div>
    )}

    {exporting && (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(15,15,25,0.95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <svg aria-hidden="true" focusable="false" width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
        <circle cx="24" cy="24" r="20" fill="none" stroke={C.accent} strokeWidth="4"
          strokeDasharray="125.6"
          strokeDashoffset={exportProgress.total > 0 ? 125.6 * (1 - exportProgress.current / exportProgress.total) : 100}
          strokeLinecap="round"
          style={{ transformOrigin: "center", transform: "rotate(-90deg)", transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div style={{ textAlign: "center" }}>
      <div style={{ color: C.text, fontWeight: 700, fontSize: 15, letterSpacing: "0.04em", marginBottom: 6 }}>
          {exportProgress.total > 1
            ? `Rendering page ${exportProgress.current} of ${exportProgress.total}...`
            : exportElapsed < 5
            ? "Building your PDF..."
            : exportElapsed < 15
            ? `Rendering your calendar... (${exportElapsed}s)`
            : `Almost there... (${exportElapsed}s)`}
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
          {exportElapsed < 8 ? "This may take a few seconds" : "Hang tight — loading all images"}
        </div>
      </div>
    </div>
  )}
  {editingProfile && (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && setEditingProfile(false)}>
      <div style={{ background: C.surface, borderRadius: 14, width: 360, padding: 28, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6, color: C.text }}>Edit Profile</div>
        <div style={{ fontSize: 12, color: C.meta, marginBottom: 18 }}>This name appears in calendar footers and your account.</div>
        <input autoFocus value={profileInput} onChange={e => setProfileInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveProfile()} placeholder="Your name..." style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16, background: C.canvas, color: C.text, fontFamily: SANS }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={saveProfile} style={{ flex: 1, padding: "10px 0", background: C.accent, color: "#000", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Save</button>
          <button onClick={() => setEditingProfile(false)} style={{ padding: "10px 16px", background: C.surface2, color: C.meta, border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  )}
  {showDraftHistory && (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}
      onClick={e => e.target === e.currentTarget && setShowDraftHistory(false)}>
      <div style={{ background: C.surface, width: 360, height: "100vh", overflowY: "auto", padding: 24, boxShadow: "-4px 0 24px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: -0.5 }}>Draft History</div>
            <div style={{ marginTop: 8, fontFamily: SANS, fontSize: 13, color: C.meta }}>{draftHistory.length} save{draftHistory.length !== 1 ? "s" : ""} · click any to restore</div>
          </div>
          <button onClick={() => setShowDraftHistory(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.meta, lineHeight: 1 }}>✕</button>
        </div>
        {draftHistory.length === 0 && (
          <div style={{ fontSize: 13, color: C.meta, textAlign: "center", padding: "40px 0" }}>No saves yet for this calendar.</div>
        )}
        {draftHistory.map(d => (
          <div key={d.id} style={{ border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 2 }}>{d.label}</div>
            <div style={{ fontSize: 11, color: C.meta, marginBottom: 10 }}>{new Date(d.saved_at).toLocaleString()}</div>
            <button onClick={() => restoreDraft(d)} style={{ width: "100%", background: C.accent, color: "#000", border: "none", borderRadius: 6, padding: "7px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Restore this version</button>
          </div>
        ))}
      </div>
    </div>
  )}

  {/* STEPS 1–3 */}
  {step !== 4 && (

    <div className="no-print" style={{ maxWidth: "none", margin: "0", padding: "36px 60px", display: "flex", gap: 48, alignItems: "flex-start" }}>
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 6, color: C.text }}>Setup</h2>
            <p style={{ color: C.meta, fontSize: 14, marginBottom: 28 }}>Basic info before we build your calendar.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 640 }}>
              <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Client Name</label>
                {!addingClient ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <select value={clientName} onChange={e => { if (e.target.value === "__add__") setAddingClient(true); else setClientName(e.target.value); }} style={inputStyle}>
                      <option value="">— Select a client —</option>
                      {clients.map(c => <option key={c.id || c.name || c} value={c.name || c}>{c.name || c}</option>)}
                      <option value="__add__">+ Add new client...</option>
                    </select>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input autoFocus value={newClientInput} onChange={e => setNewClientInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addNewClient()} placeholder="Type new client name..." style={inputStyle} />
                    <button onClick={addNewClient} style={{ ...primaryBtn, marginTop: 0, padding: "9px 18px", whiteSpace: "nowrap", fontSize: 13 }}>Add</button>
                    <button onClick={() => { setAddingClient(false); setNewClientInput(""); }} style={{ ...secondaryBtn, padding: "9px 14px", whiteSpace: "nowrap" }}>Cancel</button>
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Month</label>
                <select value={month} onChange={e => { setMonth(Number(e.target.value)); setSelectedDays([]); setPosts({}); }} style={inputStyle}>
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Year</label>
                <input type="number" value={year} min={2024} max={2030} onChange={e => { setYear(Number(e.target.value)); setSelectedDays([]); setPosts({}); }} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Posts Per Page</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[2, 3, 4].map(n => (
                    <button key={n} onClick={() => setPostsPerPage(n)} style={{
                      flex: 1, padding: "10px 0", border: `2px solid ${postsPerPage === n ? C.accent : C.border}`,
                      borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: "pointer",
                      background: postsPerPage === n ? C.canvas : C.surface,
                      color: postsPerPage === n ? C.accent : C.meta, transition: "all 0.15s",
                    }}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setStep(2)} disabled={!clientName.trim()} style={{ ...primaryBtn, marginTop: 24, opacity: clientName.trim() ? 1 : 0.4 }}>
              Next: Pick Posting Days &#8594;
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 6, color: C.text }}>Pick Posting Days</h2>
            <p style={{ color: C.meta, fontSize: 14, marginBottom: 24 }}>Click the days you'll be posting for {MONTHS[month]} {year}.</p>
            <div style={{ background: C.surface, borderRadius: 14, padding: 24, maxWidth: 400, boxShadow: "0 2px 16px rgba(0,0,0,0.2)" }}>
              <div style={{ textAlign: "center", fontWeight: 800, fontSize: 15, marginBottom: 16, color: C.text, letterSpacing: "0.04em" }}>{MONTHS[month].toUpperCase()} {year}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
                {["S","M","T","W","T","F","S"].map((d, colIdx) => {
                  const daysInCol = calendarCells.reduce((acc, day, cellIdx) => {
                    if (day && cellIdx % 7 === colIdx) acc.push(day);
                    return acc;
                  }, []);
                  const allSelected = daysInCol.length > 0 && daysInCol.every(day => selectedDays.includes(day));
                  return (
                    <div key={colIdx} onClick={() => {
                      if (allSelected) {
                        setSelectedDays(prev => {
                          const next = prev.filter(d => !daysInCol.includes(d));
                          setPosts(p => { const c = { ...p }; daysInCol.forEach(d => delete c[d]); return c; });
                          return next;
                        });
                      } else {
                        const toAdd = daysInCol.filter(d => !selectedDays.includes(d));
                        setPosts(p => { const c = { ...p }; toAdd.forEach(d => { c[d] = [newPost()]; }); return c; });
                        setSelectedDays(prev => [...new Set([...prev, ...daysInCol])]);
                      }
                    }} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, padding: "4px 0", cursor: "pointer", color: allSelected ? C.accent : C.meta, borderRadius: 4, userSelect: "none", transition: "background 0.1s" }}
                    title={`Select all ${["Sundays","Mondays","Tuesdays","Wednesdays","Thursdays","Fridays","Saturdays"][colIdx]}`}
                    onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >{d}</div>
                  );
                })}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
                {calendarCells.map((day, i) => {
                  const selected = selectedDays.includes(day);
                  return (
                    <div key={i} onClick={() => day && toggleDay(day)} style={{
                      height: 38, display: "flex", alignItems: "center", justifyContent: "center",
                      borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: day ? "pointer" : "default",
                      background: selected ? C.canvas : day ? C.surface2 : "transparent",
                      color: selected ? C.accent : day ? C.text : "transparent",
                      transition: "all 0.12s", userSelect: "none",
                    }}>{day}</div>
                  );
                })}
              </div>
            </div>
            <p style={{ marginTop: 14, fontSize: 13, color: C.meta }}>
              <strong style={{ color: C.text }}>{selectedDays.length}</strong> day{selectedDays.length !== 1 ? "s" : ""} selected
              {selectedDays.length > 0 && <span style={{ color: C.meta }}> — {sortedDays.map(d => formatDate(month, d)).join("  ·  ")}</span>}
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => setStep(1)} style={secondaryBtn}>← Back</button>
              <button onClick={() => setStep(3)} disabled={selectedDays.length === 0} style={{ ...primaryBtn, opacity: selectedDays.length === 0 ? 0.4 : 1 }}>Next: Add Content →</button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 6, color: C.text }}>Add Content</h2>
            <p style={{ color: C.meta, fontSize: 14, marginBottom: 24 }}>Fill in each posting day. Hit + to add multiple posts. Click the date to change it.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {sortedDays.map(day => {
                const dayPosts = posts[day] || [];
                return (
                  <div key={day}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <DatePicker day={day} month={month} year={year} daysInMonth={daysInMonth} selectedDays={selectedDays} onChangeDay={newDay => changeDay(day, newDay)} />
                      <button onClick={() => addPostToDay(day)} style={{ background: C.accent, color: "#000", border: "none", width: 28, height: 28, borderRadius: "50%", fontSize: 18, lineHeight: 1, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                      {dayPosts.length > 1 && <span style={{ fontSize: 11, color: C.meta }}>{dayPosts.length} posts</span>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {dayPosts.map((post, postIdx) => {
                        const dragKey = `${day}-${postIdx}`;
                        const isDropTarget = dragOver === dragKey;
                        const isCarousel = post.contentType === "Carousel";
                        const isReel = post.contentType === "Reel";
                        return (
                          <div key={post.id} onMouseEnter={() => setHoveredPostCard(`${day}-${postIdx}`)} onMouseLeave={() => setHoveredPostCard(null)} style={{ background: C.surface, borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 8px rgba(0,0,0,0.2)", borderLeft: dayPosts.length > 1 ? `3px solid ${C.accent}` : "none", position: "relative" }}>
                            {hoveredPostCard === `${day}-${postIdx}` && (
                              <button title="Remove this day" onClick={() => { setSelectedDays(prev => prev.filter(d => d !== day)); setPosts(p => { const c = { ...p }; delete c[day]; return c; }); }} style={{ position: "absolute", top: 8, right: 8, background: C.error, border: "none", color: C.text, borderRadius: "50%", width: 20, height: 20, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, zIndex: 5, lineHeight: 1 }}>✕</button>
                            )}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                              {dayPosts.length > 1 && <span style={{ fontSize: 11, color: C.meta, fontWeight: 700, minWidth: 20 }}>#{postIdx + 1}</span>}
                              <select value={post.contentType} onChange={e => {
  const newType = e.target.value;
  if (newType === "Carousel" && post.contentType !== "Carousel" && post.url && !(post.urls?.length)) {
updatePost(day, postIdx, "urls", [post.url]);
  }
  updatePost(day, postIdx, "contentType", newType);
}} style={{ ...inputStyle, width: "auto", padding: "5px 10px", fontSize: 12 }}>
                                {CONTENT_TYPES.map(t => <option key={t}>{t}</option>)}
                              </select>
                              {isCarousel && <span style={{ fontSize: 11, background: C.surface2, color: C.meta, padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>{post.imageUrls?.length || 0} image{post.imageUrls?.length !== 1 ? "s" : ""}</span>}
                              {dayPosts.length > 1 && <button onClick={() => removePostFromDay(day, postIdx)} style={{ marginLeft: "auto", background: "none", border: `1px solid ${C.border}`, color: C.meta, cursor: "pointer", fontSize: 13, borderRadius: 5, padding: "2px 8px", lineHeight: 1.5 }}>✕ Remove</button>}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div style={{ position: "relative" }}>
                                {driveUploadProgress.active && driveUploadProgress.day === day && driveUploadProgress.postIdx === postIdx && (
                                  <div style={{ position: "absolute", inset: 0, background: "rgba(30,30,30,0.92)", borderRadius: 8, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                                    <div style={{ width: 38, height: 38, border: `3.5px solid ${C.border}`, borderTop: `3.5px solid ${C.accent}`, borderRadius: "50%", animation: "cardSpin 0.75s linear infinite" }} />
                                    <span style={{ fontSize: 10, fontWeight: 700, color: C.meta, letterSpacing: "0.06em" }}>
                                      {driveUploadProgress.total > 1 ? `${driveUploadProgress.done} / ${driveUploadProgress.total}` : "UPLOADING..."}
                                    </span>
                                  </div>
                                )}
                                <label style={labelStyle}>{isCarousel ? "Images (carousel)" : isReel ? "Cover Photo" : "Image"}</label>
                                {isCarousel ? (
                                  <div>
                                    {post.imageUrls?.length > 0 && (
                                      <CarouselManager
                                        imageUrls={post.imageUrls}
                                        urls={post.urls || []}
                                        onReorder={(newImages, newUrls) => {
                                          updatePost(day, postIdx, "imageUrls", newImages);
                                          updatePost(day, postIdx, "urls", newUrls);
                                        }}
                                        onRemove={imgIdx => removeImageFromPost(day, postIdx, imgIdx)}
                                        onUrlChange={(imgIdx, val) => {
                                          const newUrls = [...(post.urls || [])];
                                          newUrls[imgIdx] = val;
                                          updatePost(day, postIdx, "urls", newUrls);
                                        }}
                                      />
                                    )}
                                    <DropZone isDropTarget={isDropTarget} label="Drop more images" onDragOver={e => { e.preventDefault(); setDragOver(dragKey); }} onDragLeave={() => setDragOver(null)} onDrop={e => { e.preventDefault(); setDragOver(null); const raw = e.dataTransfer.getData("driveFileIds"); if (raw) { handleMultiDriveFileDrop(day, postIdx, JSON.parse(raw)); } else { const did = e.dataTransfer.getData("driveFileId"); const dlink = e.dataTransfer.getData("driveFileLink"); did ? handleDriveFileDrop(day, postIdx, did, dlink) : handleFiles(day, postIdx, e.dataTransfer.files); } }} onFileInput={e => handleFiles(day, postIdx, e.target.files)} compact />
                                  </div>
                                ) : (
                                  post.imageUrls?.[0] ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `2px dashed ${C.border}`, borderRadius: 7, background: C.surface2 }}>
                                      <img src={post.imageUrls[0]} alt="" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>Image uploaded ✓</div>
                                        <div style={{ fontSize: 10, color: C.meta }}>Drop to replace</div>
                                      </div>
                                      <button onClick={() => { updatePost(day, postIdx, "imageUrls", []); updatePost(day, postIdx, "url", ""); }} style={{ background: "none", border: "none", color: C.meta, cursor: "pointer", fontSize: 18, padding: 0 }}>✕</button>
                                    </div>
                                  ) : (
                                    <>{post.placeholder ? (
                                      <div style={{ position: "relative", background: C.surface2, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "14px 16px", boxShadow: "2px 3px 10px rgba(0,0,0,0.2)", minHeight: 90, display: "flex", flexDirection: "column", gap: 8 }}>
                                        <div style={{ fontSize: 11, color: C.meta, fontWeight: 700, letterSpacing: "0.04em" }}>📝 PLACEHOLDER</div>
                                        <textarea autoFocus value={post.placeholder} onChange={e => updatePost(day, postIdx, "placeholder", e.target.value)} placeholder="e.g. Pending photo · Coming soon · In editing..." rows={3} style={{ width: "100%", background: C.canvas, border: "none", outline: "none", resize: "none", fontSize: 12, fontFamily: SANS, color: C.text, lineHeight: 1.5, padding: 0 }} />
                                        <button onClick={() => updatePost(day, postIdx, "placeholder", "")} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.12)", color: C.meta, border: "none", borderRadius: "50%", width: 16, height: 16, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                                      </div>
                                    ) : (
                                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        <DropZone isDropTarget={isDropTarget} label="Drag & drop or browse" onDragOver={e => { e.preventDefault(); setDragOver(dragKey); }} onDragLeave={() => setDragOver(null)} onDrop={e => { e.preventDefault(); setDragOver(null); const raw = e.dataTransfer.getData("driveFileIds"); if (raw) { handleMultiDriveFileDrop(day, postIdx, JSON.parse(raw)); } else { const did = e.dataTransfer.getData("driveFileId"); const dlink = e.dataTransfer.getData("driveFileLink"); did ? handleDriveFileDrop(day, postIdx, did, dlink) : handleFiles(day, postIdx, e.dataTransfer.files); } }} onFileInput={e => handleFiles(day, postIdx, e.target.files)} urlValue={post.imageUrls?.[0] || ""} onUrlChange={v => updatePost(day, postIdx, "imageUrls", v ? [v] : [])} />
                                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                          <button onClick={() => updatePost(day, postIdx, "placeholder", "Pending photo")} style={{ width: "100%", padding: "7px 0", background: C.surface2, border: `1.5px dashed ${C.border}`, borderRadius: 6, fontSize: 11, color: C.meta, cursor: "pointer", fontFamily: SANS, fontWeight: 600 }}>
                                            📝 Add placeholder note
                                          </button>

                                        </div>
                                      </div>
                                    )}</>
                                  )
                                )}
                              </div>
                              {!isCarousel && !post.placeholder && <div>
                                <label style={labelStyle}>{isReel ? "Video Link" : "Content Link (for client)"}</label>
                                {isReel ? (
                                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <input
                                    value={post.videoUrl || ""}
                                    placeholder="Paste or pick video link from Drive..."
                                    onChange={e => updatePost(day, postIdx, "videoUrl", e.target.value)}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={e => {
                                      e.preventDefault();
                                      const link = e.dataTransfer.getData("driveFileLink");
                                      if (link) updatePost(day, postIdx, "videoUrl", link);
                                    }}
                                    style={{ ...inputStyle, fontSize: 12, background: post.videoUrl ? C.canvas : C.surface2, border: `1.5px ${post.videoUrl ? "solid" : "dashed"} ${C.border}` }}
                                  />
                                    <button
                                      title="Pick from Drive"
                                      onClick={() => {
                                        setDriveOpen(true);
                                        setLinkPickMode({ active: true, onPick: (link) => updatePost(day, postIdx, "videoUrl", link) });
                                      }}
                                      style={{ background: C.surface, border: "none", color: C.accent, borderRadius: 7, width: 34, height: 34, fontSize: 15, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                                    >📁</button>
                                  </div>
                                ) : (
                                  <div>
                                    <input
                                      value={post.url || ""}
                                      placeholder="Paste link or drag from Drive..."
                                      onChange={e => updatePost(day, postIdx, "url", e.target.value)}
                                      onDragOver={e => e.preventDefault()}
                                      onDrop={e => {
                                        e.preventDefault();
                                        const link = e.dataTransfer.getData("driveFileLink");
                                        if (link) updatePost(day, postIdx, "url", link);
                                      }}
                                      style={{ ...inputStyle, background: post.url ? C.canvas : C.surface2, border: `1.5px ${post.url ? "solid" : "dashed"} ${C.border}` }}
                                    />
                                  </div>
                                )}
                                </div>}
                              <div style={{ gridColumn: "1 / -1" }}>
                                <label style={labelStyle}>Caption</label>
                                <textarea value={post.caption || ""} rows={2} placeholder="Caption or hook..." onChange={e => updatePost(day, postIdx, "caption", e.target.value)} style={{ ...inputStyle, resize: "vertical", fontFamily: SANS }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => { setStep(2); setLinkPickMode({ active: false, onPick: null }); }} style={secondaryBtn}>← Back</button>
              <button onClick={() => { setStep(4); setLinkPickMode({ active: false, onPick: null }); }} style={primaryBtn}>Preview Calendar →</button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: sticky preview + drive panel */}
      <div style={{ width: 420, flexShrink: 0, position: "sticky", top: 80, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 10, color: C.meta, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>Live Preview</div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
            <div style={{ fontFamily: DISP, fontSize: 11, color: C.text }}>{MONTHS[month]} {year} <em>| Content Calendar</em></div>
            <div style={{ fontFamily: DISP, fontSize: 11, color: C.meta, fontWeight: 700 }}>{clientName || <span style={{ color: C.meta, fontStyle: "italic", fontWeight: 400 }}>Client Name</span>}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ flex: 1, display: "flex", gap: 6 }}>
              {Array.from({ length: postsPerPage }).map((_, i) => {
                const post = allPosts[i];
                const mainImage = post?.imageUrls?.[0];
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ background: C.canvas, borderRadius: 20, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {post?.day && <span style={{ color: C.accent, fontSize: 7, fontWeight: 700 }}>{getDayName(year, month, post.day).slice(0,3).toUpperCase()} {formatDate(month, post.day)}</span>}
                    </div>
                    <div style={{ aspectRatio: "4 / 5", background: C.surface2, borderRadius: 4, overflow: "hidden", position: "relative" }}>
                      {mainImage && <img src={mainImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                      {post?.contentType === "Carousel" && post?.imageUrls?.length > 1 && (
                        <div style={{ position: "absolute", bottom: 2, right: 2, background: "rgba(0,0,0,0.6)", color: C.text, fontSize: 7, borderRadius: 3, padding: "1px 4px" }}>{post.imageUrls.length}</div>
                      )}
                    </div>
                    <div style={{ background: C.canvas, borderRadius: 20, height: 10 }} />
                    <div style={{ background: C.surface2, borderRadius: 4, height: 24 }} />
                  </div>
                );
              })}
            </div>
            <div style={{ width: 52, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ background: C.surface2, borderRadius: 4, height: 36 }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)" }}>
                {Array.from({ length: 18 }).map((_, i) => <div key={i} style={{ aspectRatio: "1", background: C.surface2, borderRadius: 1 }} />)}
              </div>
            </div>
          </div>
          </div>
        {step === 3 && (
          <div style={{ background: "#fff", border: "1px solid #dbdbdb", borderRadius: 12, padding: "14px", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
            <ReorderFeedGrid
              allPosts={allPosts.filter(p => p.contentType !== "Story")}
              onSwap={swapPostContent}
              onBatchImport={handleBatchImport}
              onDriveBatchImport={handleDriveBatchImport}
              driveUploadProgress={driveUploadProgress}
              pinnedCount={pinnedCount}
              setPinnedCount={setPinnedCount}
              lightMode
            />
          </div>
        )}

      </div>
    </div>
  )}

  {/* STEP 4 */}
  {step === 4 && (
    <div className="no-print" style={{ maxWidth: "none", margin: "0", padding: "24px 40px 16px", background: C.canvas }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 4, color: C.text }}>Preview</h2>
          <p style={{ color: C.meta, fontSize: 14 }}>{pages.length} page{pages.length !== 1 ? "s" : ""} · {allPosts.length} posts</p>
        </div>
        <button onClick={() => setStep(3)} style={secondaryBtn}>← Edit Content</button>
      </div>

    </div>
  )}

{step === 4 && (
    <div className="cal-pages-outer" style={{ padding: "0px 100px 100px", maxWidth: "none", margin: "0", background: C.canvas }}>
      {pages.map((pagePosts, pageIdx) => (
        <CalendarPage key={pageIdx} posts={pagePosts} allPosts={allPosts} clientName={clientName} month={month} year={year}
        onUpdatePost={(day, postIdx, field, val) => updatePost(day, postIdx, field, val)}
        onSwapPosts={swapPostContent}
        onBatchImport={handleBatchImport}
              onDriveBatchImport={handleDriveBatchImport}
              driveUploadProgress={driveUploadProgress}
              pinnedCount={pinnedCount}
              setPinnedCount={setPinnedCount}
        postsPerPage={postsPerPage}
        exporting={exporting || exportMode}
        builderName={profileName}
        onDriveDrop={handleMultiDriveFileDrop}
        onFilesDrop={handleFiles}
        onPickReelLink={(day, postIdx) => { setDriveOpen(true); setLinkPickMode({ active: true, onPick: (link) => updatePost(day, postIdx, "videoUrl", link) }); }}
        notes={calendarNotes}
        onNotesChange={setCalendarNotes}
        notesImage={calendarNotesImage}
        onNotesImageChange={setCalendarNotesImage}
        driveToken={driveToken}
      />
      ))}
    </div>
  )}

{step >= 3 && (
    <button
      data-drive-toggle
      onClick={driveToken ? () => setDriveOpen(o => !o) : connectDrive}
      title={driveToken ? "Toggle Drive panel" : "Connect Google Drive"}
      className="no-print"
      style={{
        position: "fixed",
        bottom: 28,
        right: driveOpen ? drivePanelWidth + 14 : 24,
        zIndex: 498,
        background: driveOpen ? C.accent : C.canvas,
        color: driveOpen ? "#000" : driveToken ? C.accent : C.meta,
        border: driveToken && !driveOpen ? `1.5px solid rgba(204,255,0,0.25)` : "none",
        borderRadius: 28,
        padding: "11px 20px",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: "0.05em",
        cursor: "pointer",
        boxShadow: driveOpen ? "0 4px 20px rgba(204,255,0,0.25)" : "0 4px 24px rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        gap: 7,
        transition: "right 0.2s ease, background 0.15s, box-shadow 0.15s",
        userSelect: "none",
      }}
    >
      <span style={{ fontSize: 13 }}>📁</span>
      {driveToken ? (driveOpen ? "Close Drive" : "Drive") : "Connect Drive"}
      {driveToken && !driveOpen && (
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, flexShrink: 0 }} />
      )}
    </button>
  )}

{linkPickMode.active && (
    <div onClick={() => { setLinkPickMode({ active: false, onPick: null }); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 450, cursor: "pointer" }} />
  )}
  {driveToken && (
    <DrivePanel
    token={driveToken}
    isOpen={driveOpen}
    onClose={() => setDriveOpen(false)}
    onTokenExpired={() => { setDriveToken(null); setDriveOpen(false); showToast("Drive session expired — click Drive to reconnect.", "error"); }}
    width={drivePanelWidth}
    onWidthChange={setDrivePanelWidth}
    linkPickMode={linkPickMode}
    onExitPickMode={() => setLinkPickMode({ active: false, onPick: null })}
  />
  )}
    </main>
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Dancing+Script:wght@600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
input:focus, select:focus, textarea:focus { border-color: ${C.accent} !important; }
    /* Headless PDF: Chromium may not apply @media print for page.pdf(); hide chrome like .no-print */
    html[data-pdf-export="1"] .no-print,
    html[data-pdf-export="1"] [data-drive-toggle],
    html[data-pdf-export="1"] [data-drive-panel] {
      display: none !important;
    }
    html[data-pdf-export="1"] .cal-pages-outer { padding: 0 !important; }
    @media print { .cal-pages-outer { padding: 0 !important; } }
    @media print {
      .no-print { display: none !important; }
      body { background: white !important; }
      .cal-page { page-break-after: always; box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; border: none !important; }
    }
  `}</style>
  <Toaster theme="dark" position="bottom-right" richColors />
  <AppDialog open={resetConfirm} onClose={() => setResetConfirm(false)} title="Reset calendar">
    <p style={{ fontSize: 14, color: C.meta, fontFamily: SANS, marginTop: 8, marginBottom: 24, lineHeight: "160%" }}>Reset calendar to blank? You can undo this.</p>
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
      <button onClick={() => setResetConfirm(false)} style={ghostBtn}>Cancel</button>
      <button onClick={() => { resetCalendar(); setResetConfirm(false); }} style={dangerBtn}>Reset</button>
    </div>
  </AppDialog>
</div>
  );
}
