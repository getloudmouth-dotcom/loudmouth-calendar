import { useState, useMemo, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CONTENT_TYPES = ["Photo", "Reel", "Carousel", "Story"];
const DEFAULT_CLIENTS = ["Sane Studio", "10 Mas Seis", "Loudmouth Media"];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
function getDayName(year, month, day) { return new Date(year, month, day).toLocaleDateString("en-US", { weekday: "long" }); }
function formatDate(month, day) { return `${String(month + 1).padStart(2, "0")}/${String(day).padStart(2, "0")}`; }
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}
function newPost() {
  return { id: Date.now() + Math.random(), contentType: "Photo", imageUrls: [], url: "", urls: [], caption: "", cropX: 50, cropY: 50, scale: 1, placeholder: "" };
}
const CONTENT_FIELDS = ["contentType", "imageUrls", "url", "urls", "caption", "cropX", "cropY", "scale", "placeholder"];

const labelStyle = { fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4, fontWeight: 600 };
const inputStyle = { width: "100%", padding: "9px 12px", border: "1.5px solid #e0e0e0", borderRadius: 7, fontSize: 13, outline: "none", fontFamily: "inherit", transition: "border-color 0.15s", background: "white", color: "#111" };
const primaryBtn = { background: "#1a1a2e", color: "#D7FA06", border: "none", padding: "12px 26px", borderRadius: 7, fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em" };
const secondaryBtn = { background: "#f0f0ee", color: "#555", border: "none", padding: "11px 20px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer" };

// ── Inline Date Picker Pill ──
function DatePicker({ day, month, year, daysInMonth, selectedDays, onChangeDay }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => setOpen(o => !o)} style={{ background: "#1a1a2e", color: "white", borderRadius: 20, padding: "6px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: 6 }}>
        {getDayName(year, month, day)} {formatDate(month, day)}
        <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "110%", left: 0, zIndex: 999, background: "white", border: "1.5px solid #e0e0e0", borderRadius: 10, padding: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 220 }}>
          <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, fontWeight: 600 }}>Change date</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {["S","M","T","W","T","F","S"].map((d, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 9, color: "#ccc", fontWeight: 700, padding: "2px 0" }}>{d}</div>
            ))}
            {Array.from({ length: new Date(year, month, 1).getDay() }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const isSelected = d === day;
              const isTaken = selectedDays.includes(d) && d !== day;
              return (
                <div key={d} onClick={() => { if (isTaken) return; onChangeDay(d); setOpen(false); }} style={{
                  textAlign: "center", padding: "5px 2px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                  cursor: isTaken ? "not-allowed" : "pointer",
                  background: isSelected ? "#1a1a2e" : "transparent",
                  color: isSelected ? "#D7FA06" : isTaken ? "#ddd" : "#333",
                  transition: "all 0.1s",
                }}>{d}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Draggable Image ──
function DraggableImage({ src, cropX, cropY, scale, onUpdate, isCarousel, imageUrls, isVideo, placeholder }) {
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
          <img src={src} alt="" style={{ position: "absolute", width: `${(scale??1)*100}%`, height: `${(scale??1)*100}%`, objectFit: "cover", left: `${(1-(scale??1))*cropX}%`, top: `${(1-(scale??1))*cropY}%`, display: "block", pointerEvents: "none" }} />
          
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

export default function App() {
  const today = new Date();
  const [step, setStep] = useState(1);
  const [clientName, setClientName] = useState("");
  const [clients, setClients] = useState(DEFAULT_CLIENTS);
  const [addingClient, setAddingClient] = useState(false);
  const [newClientInput, setNewClientInput] = useState("");
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [postsPerPage, setPostsPerPage] = useState(3);
  const [selectedDays, setSelectedDays] = useState([]);
  const [posts, setPosts] = useState({});
  const [dragOver, setDragOver] = useState(null);
  const [driveApiKey, setDriveApiKey] = useState(() => localStorage.getItem("lm_driveKey") || "");
  const [drivePicker, setDrivePicker] = useState(null); // { day, postIdx }

  async function handleDriveFileDrop(day, postIdx, fileId) {
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${driveApiKey}`);
      if (!res.ok) throw new Error("Fetch failed — check API key or file visibility");
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = ev => {
        setPosts(p => {
          const arr = [...(p[day] || [])];
          const post = { ...arr[postIdx] };
          post.imageUrls = [...(post.imageUrls || []), ev.target.result];
          if (post.imageUrls.length > 1) post.contentType = "Carousel";
          arr[postIdx] = post;
          return { ...p, [day]: arr };
        });
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      alert("Couldn't load from Drive: " + e.message);
    }
  }
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const sortedDays = useMemo(() => [...selectedDays].sort((a, b) => a - b), [selectedDays]);

  const allPosts = useMemo(() =>
    sortedDays.flatMap(d => {
      const dayPosts = posts[d];
      if (!dayPosts || dayPosts.length === 0) return [{ ...newPost(), day: d, postIdx: 0 }];
      return dayPosts.map((p, idx) => ({ ...p, day: d, postIdx: idx }));
    }), [sortedDays, posts]);

  const pages = useMemo(() => chunkArray(allPosts, postsPerPage), [allPosts, postsPerPage]);

  const calendarCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month, year, firstDay, daysInMonth]);

  function toggleDay(day) {
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        const next = prev.filter(d => d !== day);
        setPosts(p => { const c = { ...p }; delete c[day]; return c; });
        return next;
      }
      setPosts(p => ({ ...p, [day]: [newPost()] }));
      return [...prev, day];
    });
  }

  function changeDay(oldDay, newDay) {
    if (oldDay === newDay) return;
    setSelectedDays(prev => prev.map(d => d === oldDay ? newDay : d));
    setPosts(p => { const c = { ...p }; c[newDay] = c[oldDay]; delete c[oldDay]; return c; });
  }

  function addPostToDay(day) {
    setPosts(p => ({ ...p, [day]: [...(p[day] || []), newPost()] }));
  }

  function removePostFromDay(day, postIdx) {
    setPosts(p => {
      const arr = [...(p[day] || [])];
      if (arr.length <= 1) return p;
      arr.splice(postIdx, 1);
      return { ...p, [day]: arr };
    });
  }

  function updatePost(day, postIdx, field, value) {
    setPosts(p => {
      const arr = [...(p[day] || [])];
      arr[postIdx] = { ...arr[postIdx], [field]: value };
      return { ...p, [day]: arr };
    });
  }

  // Swap content between two posts — keeps each post's day, only swaps content fields
  function swapPostContent(dayA, idxA, dayB, idxB) {
    if (dayA === dayB && idxA === idxB) return;
    setPosts(p => {
      const next = { ...p };
      const arrA = [...(next[dayA] || [])];
      const arrB = dayA === dayB ? arrA : [...(next[dayB] || [])];
      const postA = { ...arrA[idxA] };
      const postB = { ...arrB[idxB] };
      // Swap only content fields
      CONTENT_FIELDS.forEach(field => {
        const tmp = postA[field];
        postA[field] = postB[field];
        postB[field] = tmp;
      });
      arrA[idxA] = postA;
      if (dayA === dayB) {
        arrA[idxB] = postB;
        next[dayA] = arrA;
      } else {
        arrB[idxB] = postB;
        next[dayA] = arrA;
        next[dayB] = arrB;
      }
      return next;
    });
  }

  function handleFiles(day, postIdx, files) {
    const imageFiles = [...files].filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    const forceCarousel = imageFiles.length > 1;
    const promises = imageFiles.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = ev => resolve(ev.target.result);
      reader.readAsDataURL(file);
    }));
    Promise.all(promises).then(dataUrls => {
      setPosts(p => {
        const arr = [...(p[day] || [])];
        const post = { ...arr[postIdx] };
        if (forceCarousel || post.contentType === "Carousel") {
          post.contentType = "Carousel";
          post.imageUrls = [...(post.imageUrls || []), ...dataUrls];
        } else {
          post.imageUrls = [dataUrls[0]];
        }
        arr[postIdx] = post;
        return { ...p, [day]: arr };
      });
    });
  }

  function removeImageFromPost(day, postIdx, imgIdx) {
    setPosts(p => {
      const arr = [...(p[day] || [])];
      const post = { ...arr[postIdx] };
      post.imageUrls = post.imageUrls.filter((_, i) => i !== imgIdx);
      arr[postIdx] = post;
      return { ...p, [day]: arr };
    });
  }

  function addNewClient() {
    const name = newClientInput.trim();
    if (!name) return;
    setClients(prev => [...prev, name]);
    setClientName(name);
    setNewClientInput("");
    setAddingClient(false);
  }

  async function exportPDF() {
    const pages = document.querySelectorAll(".cal-page");
    if (!pages.length) return;
    const w = pages[0].offsetWidth;
    const h = pages[0].offsetHeight;
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [w, h] });
    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff" });
      if (i > 0) pdf.addPage([w, h], "landscape");
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, w, h);
    }
    pdf.save(`${clientName || "calendar"}-content-calendar.pdf`);
  }

  const stepLabels = ["Setup", "Pick Days", "Content", "Preview"];

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", minHeight: "100vh", background: "#f4f4f0" }}>

      {/* NAV */}
      <nav className="no-print" style={{ background: "#1a1a2e", padding: "12px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ color: "#D7FA06", fontWeight: 900, fontSize: 17, letterSpacing: "0.12em" }}>LOUDMOUTH</span>
        <div style={{ display: "flex", gap: 6 }}>
          {stepLabels.map((label, i) => {
            const s = i + 1;
            return (
              <button key={s} onClick={() => setStep(s)} style={{
                background: step === s ? "#D7FA06" : "rgba(255,255,255,0.07)",
                color: step === s ? "#111" : "#aaa",
                border: "none", padding: "6px 16px", borderRadius: 20,
                fontSize: 12, cursor: "pointer", fontWeight: 700, transition: "all 0.15s",
              }}>{s}. {label}</button>
            );
          })}
        </div>
        {step === 4 && <button onClick={exportPDF} style={{ ...primaryBtn, fontSize: 12, padding: "8px 18px" }}>↓ Export PDF</button>}
        {step !== 4 && <div style={{ width: 120 }} />}
      </nav>

      {/* STEPS 1–3 */}
      {step !== 4 && (
        <div className="no-print" style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 24px", display: "flex", gap: 32, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* STEP 1 */}
            {step === 1 && (
              <div>
                <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 6 }}>Setup</h2>
                <p style={{ color: "#999", fontSize: 14, marginBottom: 28 }}>Basic info before we build your calendar.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 520 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>Client Name</label>
                    {!addingClient ? (
                      <select value={clientName} onChange={e => { if (e.target.value === "__add__") setAddingClient(true); else setClientName(e.target.value); }} style={inputStyle}>
                        <option value="">— Select a client —</option>
                        {clients.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="__add__">+ Add new client...</option>
                      </select>
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
                          flex: 1, padding: "10px 0", border: `2px solid ${postsPerPage === n ? "#1a1a2e" : "#ddd"}`,
                          borderRadius: 7, fontWeight: 700, fontSize: 14, cursor: "pointer",
                          background: postsPerPage === n ? "#1a1a2e" : "white",
                          color: postsPerPage === n ? "#D7FA06" : "#555", transition: "all 0.15s",
                        }}>{n}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={() => setStep(2)} disabled={!clientName.trim()} style={{ ...primaryBtn, marginTop: 32, opacity: clientName.trim() ? 1 : 0.4 }}>
                  Next: Pick Posting Days →
                </button>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div>
                <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 6 }}>Pick Posting Days</h2>
                <p style={{ color: "#999", fontSize: 14, marginBottom: 24 }}>Click the days you'll be posting for {MONTHS[month]} {year}.</p>
                <div style={{ background: "white", borderRadius: 14, padding: 24, maxWidth: 400, boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
                  <div style={{ textAlign: "center", fontWeight: 800, fontSize: 15, marginBottom: 16, color: "#222", letterSpacing: "0.04em" }}>{MONTHS[month].toUpperCase()} {year}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
                    {["S","M","T","W","T","F","S"].map((d, i) => (
                      <div key={i} style={{ textAlign: "center", fontSize: 10, color: "#bbb", fontWeight: 700, padding: "4px 0" }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
                    {calendarCells.map((day, i) => {
                      const selected = selectedDays.includes(day);
                      return (
                        <div key={i} onClick={() => day && toggleDay(day)} style={{
                          height: 38, display: "flex", alignItems: "center", justifyContent: "center",
                          borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: day ? "pointer" : "default",
                          background: selected ? "#1a1a2e" : day ? "#f4f4f0" : "transparent",
                          color: selected ? "#D7FA06" : day ? "#333" : "transparent",
                          transition: "all 0.12s", userSelect: "none",
                        }}>{day}</div>
                      );
                    })}
                  </div>
                </div>
                <p style={{ marginTop: 14, fontSize: 13, color: "#666" }}>
                  <strong>{selectedDays.length}</strong> day{selectedDays.length !== 1 ? "s" : ""} selected
                  {selectedDays.length > 0 && <span style={{ color: "#999" }}> — {sortedDays.map(d => formatDate(month, d)).join("  ·  ")}</span>}
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
                <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 6 }}>Add Content</h2>
                <p style={{ color: "#999", fontSize: 14, marginBottom: 24 }}>Fill in each posting day. Hit + to add multiple posts. Click the date to change it.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {sortedDays.map(day => {
                    const dayPosts = posts[day] || [];
                    return (
                      <div key={day}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <DatePicker day={day} month={month} year={year} daysInMonth={daysInMonth} selectedDays={selectedDays} onChangeDay={newDay => changeDay(day, newDay)} />
                          <button onClick={() => addPostToDay(day)} style={{ background: "#D7FA06", color: "#111", border: "none", width: 28, height: 28, borderRadius: "50%", fontSize: 18, lineHeight: 1, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                          {dayPosts.length > 1 && <span style={{ fontSize: 11, color: "#aaa" }}>{dayPosts.length} posts</span>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {dayPosts.map((post, postIdx) => {
                            const dragKey = `${day}-${postIdx}`;
                            const isDropTarget = dragOver === dragKey;
                            const isCarousel = post.contentType === "Carousel";
                            const isReel = post.contentType === "Reel";
                            return (
                              <div key={post.id} style={{ background: "white", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", borderLeft: dayPosts.length > 1 ? "3px solid #D7FA06" : "none" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                  {dayPosts.length > 1 && <span style={{ fontSize: 11, color: "#aaa", fontWeight: 700, minWidth: 20 }}>#{postIdx + 1}</span>}
                                  <select value={post.contentType} onChange={e => updatePost(day, postIdx, "contentType", e.target.value)} style={{ ...inputStyle, width: "auto", padding: "5px 10px", fontSize: 12 }}>
                                    {CONTENT_TYPES.map(t => <option key={t}>{t}</option>)}
                                  </select>
                                  {isCarousel && <span style={{ fontSize: 11, background: "#f0f4ff", color: "#555", padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>{post.imageUrls?.length || 0} image{post.imageUrls?.length !== 1 ? "s" : ""}</span>}
                                  {dayPosts.length > 1 && <button onClick={() => removePostFromDay(day, postIdx)} style={{ marginLeft: "auto", background: "none", border: "1px solid #eee", color: "#ccc", cursor: "pointer", fontSize: 13, borderRadius: 5, padding: "2px 8px", lineHeight: 1.5 }}>✕ Remove</button>}
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                  <div>
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
                                        <DropZone isDropTarget={isDropTarget} label="Drop more images" onDragOver={e => { e.preventDefault(); setDragOver(dragKey); }} onDragLeave={() => setDragOver(null)} onDrop={e => { e.preventDefault(); setDragOver(null); const did = e.dataTransfer.getData("driveFileId"); did ? handleDriveFileDrop(day, postIdx, did) : handleFiles(day, postIdx, e.dataTransfer.files); }} onFileInput={e => handleFiles(day, postIdx, e.target.files)} compact />
                                      </div>
                                    ) : (
                                      post.imageUrls?.[0] ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "2px dashed #e0e0e0", borderRadius: 7, background: "#fafafa" }}>
                                          <img src={post.imageUrls[0]} alt="" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
                                          <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 12, color: "#333", fontWeight: 600 }}>Image uploaded ✓</div>
                                            <div style={{ fontSize: 10, color: "#aaa" }}>Drop to replace</div>
                                          </div>
                                          <button onClick={() => updatePost(day, postIdx, "imageUrls", [])} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 18, padding: 0 }}>✕</button>
                                        </div>
                                      ) : (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                          <DropZone isDropTarget={isDropTarget} label="Drag & drop or browse" onDragOver={e => { e.preventDefault(); setDragOver(dragKey); }} onDragLeave={() => setDragOver(null)} onDrop={e => { e.preventDefault(); setDragOver(null); const did = e.dataTransfer.getData("driveFileId"); did ? handleDriveFileDrop(day, postIdx, did) : handleFiles(day, postIdx, e.dataTransfer.files); }} onFileInput={e => handleFiles(day, postIdx, e.target.files)} urlValue={post.imageUrls?.[0] || ""} onUrlChange={v => updatePost(day, postIdx, "imageUrls", v ? [v] : [])} />
                                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                            {post.placeholder ? (
                                              <div style={{ position: "relative" }}>
                                                <textarea autoFocus value={post.placeholder} onChange={e => updatePost(day, postIdx, "placeholder", e.target.value)} placeholder="e.g. Pending photo · Coming soon · In editing..." rows={2} style={{ width: "100%", padding: "8px 10px", background: "#FFF9C4", border: "1px solid #F0E060", borderRadius: 6, fontSize: 12, fontFamily: "'Helvetica Neue', sans-serif", resize: "none", outline: "none", color: "#555", boxShadow: "2px 2px 6px rgba(0,0,0,0.08)" }} />
                                                <button onClick={() => updatePost(day, postIdx, "placeholder", "")} style={{ position: "absolute", top: -6, right: -6, background: "#ccc", color: "white", border: "none", borderRadius: "50%", width: 16, height: 16, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                                              </div>
                                            ) : (
                                              <button onClick={() => updatePost(day, postIdx, "placeholder", "Pending photo")} style={{ width: "100%", padding: "7px 0", background: "#FFFDE7", border: "1.5px dashed #F0E060", borderRadius: 6, fontSize: 11, color: "#aaa", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                                                📝 Add placeholder note
                                              </button>
                                            )}
                                            {driveApiKey && (
                                              <button onClick={() => setDrivePicker({ day, postIdx })} style={{ width: "100%", padding: "7px 0", background: "#f0f4ff", border: "1.5px solid #d0d8ff", borderRadius: 6, fontSize: 11, color: "#555", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                                                📁 Pick from Drive
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                  <div>
                                    <label style={labelStyle}>{isReel ? "Reel Links" : "Content Link (for client)"}</label>
                                    {isReel ? (
                                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                        {[...(post.urls && post.urls.length > 0 ? post.urls : [""]), ""].map((u, ui) => {
                                          const isLastEmpty = ui === (post.urls?.length || 0);
                                          return (
                                            <div key={ui} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                              <input
                                                value={u}
                                                placeholder={`Link ${ui + 1}...`}
                                                onChange={e => {
                                                  const newUrls = [...(post.urls || [])];
                                                  newUrls[ui] = e.target.value;
                                                  updatePost(day, postIdx, "urls", newUrls.filter((v, i) => v || i < newUrls.length - 1));
                                                }}
                                                style={{ ...inputStyle, fontSize: 12, padding: "7px 10px" }}
                                              />
                                              {!isLastEmpty && <button onClick={() => { const newUrls = (post.urls || []).filter((_, i) => i !== ui); updatePost(day, postIdx, "urls", newUrls); }} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>✕</button>}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <input value={post.url || ""} placeholder="https://..." onChange={e => updatePost(day, postIdx, "url", e.target.value)} style={inputStyle} />
                                    )}
                                  </div>
                                  <div style={{ gridColumn: "1 / -1" }}>
                                    <label style={labelStyle}>Caption</label>
                                    <textarea value={post.caption || ""} rows={2} placeholder="Caption or hook..." onChange={e => updatePost(day, postIdx, "caption", e.target.value)} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
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
                  <button onClick={() => setStep(2)} style={secondaryBtn}>← Back</button>
                  <button onClick={() => setStep(4)} style={primaryBtn}>Preview Calendar →</button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: sticky preview + drive panel */}
          <div style={{ width: 320, flexShrink: 0, position: "sticky", top: 80, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 10, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>Live Preview</div>
            <div style={{ background: "white", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: 10 }}>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 11, color: "#111" }}>{MONTHS[month]} {year} <em>| Content Calendar</em></div>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 11, color: "#444", fontWeight: 700 }}>{clientName || <span style={{ color: "#ccc", fontStyle: "italic", fontWeight: 400 }}>Client Name</span>}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 1, display: "flex", gap: 6 }}>
                  {Array.from({ length: postsPerPage }).map((_, i) => {
                    const post = allPosts[i];
                    const mainImage = post?.imageUrls?.[0];
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ background: "#1a1a2e", borderRadius: 20, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {post?.day && <span style={{ color: "#D7FA06", fontSize: 7, fontWeight: 700 }}>{getDayName(year, month, post.day).slice(0,3).toUpperCase()} {formatDate(month, post.day)}</span>}
                        </div>
                        <div style={{ aspectRatio: "4 / 5", background: "#e8e8e8", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                          {mainImage && <img src={mainImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                          {post?.contentType === "Carousel" && post?.imageUrls?.length > 1 && (
                            <div style={{ position: "absolute", bottom: 2, right: 2, background: "rgba(0,0,0,0.6)", color: "white", fontSize: 7, borderRadius: 3, padding: "1px 4px" }}>{post.imageUrls.length}</div>
                          )}
                        </div>
                        <div style={{ background: "#1a1a2e", borderRadius: 20, height: 10 }} />
                        <div style={{ background: "#f0f0f0", borderRadius: 4, height: 24 }} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ width: 52, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ background: "#f0f0f0", borderRadius: 4, height: 36 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)" }}>
                    {Array.from({ length: 18 }).map((_, i) => <div key={i} style={{ aspectRatio: "1", background: "#e8e8e8", borderRadius: 1 }} />)}
                  </div>
                </div>
              </div>
              </div>
          
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="no-print" style={{ maxWidth: "none", margin: "0", padding: "24px 40px 16px", background: "#f0f0ec" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 4 }}>Preview</h2>
              <p style={{ color: "#999", fontSize: 14 }}>{pages.length} page{pages.length !== 1 ? "s" : ""} · {allPosts.length} posts</p>
            </div>
            <button onClick={() => setStep(3)} style={secondaryBtn}>← Edit Content</button>
          </div>
          
        </div>
      )}

{step === 4 && (
        <div style={{ padding: "0", maxWidth: "none", margin: "0", background: "#f0f0ec" }}>
          {pages.map((pagePosts, pageIdx) => (
            <CalendarPage key={pageIdx} posts={pagePosts} allPosts={allPosts} clientName={clientName} month={month} year={year}
            onUpdatePost={(day, postIdx, field, val) => updatePost(day, postIdx, field, val)}
            onSwapPosts={swapPostContent}
            postsPerPage={postsPerPage}
          />
          ))}
        </div>
      )}
{drivePicker && (
        <DrivePickerModal
          apiKey={driveApiKey}
          onSelect={dataUrl => {
            setPosts(p => {
              const arr = [...(p[drivePicker.day] || [])];
              const post = { ...arr[drivePicker.postIdx] };
              post.imageUrls = [...(post.imageUrls || []), dataUrl];
              if (post.imageUrls.length > 1) post.contentType = "Carousel";
              arr[drivePicker.postIdx] = post;
              return { ...p, [drivePicker.day]: arr };
            });
          }}
          onClose={() => setDrivePicker(null)}
        />
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, select:focus, textarea:focus { border-color: #1a1a2e !important; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .cal-page { page-break-after: always; box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; border: none !important; }
        }
      `}</style>
    </div>
  );
}


function DrivePickerModal({ apiKey, onSelect, onClose }) {
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
      let dataUrl = previewing;
      if (!dataUrl || dataUrl === "error") {
        const r = await fetch(`https://www.googleapis.com/drive/v3/files/${selected.id}?alt=media&key=${apiKey}`);
        const blob = await r.blob();
        dataUrl = await new Promise(res => { const fr = new FileReader(); fr.onload = e => res(e.target.result); fr.readAsDataURL(blob); });
      } else {
        // convert blob URL to dataURL for persistence
        const r = await fetch(dataUrl);
        const blob = await r.blob();
        dataUrl = await new Promise(res => { const fr = new FileReader(); fr.onload = e => res(e.target.result); fr.readAsDataURL(blob); });
      }
      onSelect(dataUrl);
      onClose();
    } catch { alert("Failed to load image"); }
    setAdding(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "white", borderRadius: 14, width: 680, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>📁 Pick from Google Drive</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa", lineHeight: 1 }}>✕</button>
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
                {previewing === "error" && <span style={{ fontSize: 12, color: "#aaa" }}>Failed</span>}
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
function CarouselManager({ imageUrls, urls, onReorder, onRemove, onUrlChange }) {
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
              outline: dragSrc !== null && dragSrc !== imgIdx ? "2px dashed #ccc" : "none",
              borderRadius: 5, transition: "opacity 0.1s",
            }}
          >
            <img src={url} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 5, pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: 2, left: 2, background: "rgba(0,0,0,0.55)", color: "white", fontSize: 8, borderRadius: 3, padding: "1px 4px", pointerEvents: "none" }}>{imgIdx + 1}</div>
            <button onClick={() => onRemove(imgIdx)} style={{ position: "absolute", top: -4, right: -4, background: "#111", color: "white", border: "none", borderRadius: "50%", width: 16, height: 16, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        ))}
      </div>
      {/* Expandable per-slide links */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 6, fontSize: 11, color: "#888", cursor: "pointer", padding: "4px 10px", fontFamily: "inherit", width: "100%", textAlign: "left" }}
      >
        {expanded ? "▾" : "▸"} Links per slide ({imageUrls.length})
      </button>
      {expanded && (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5 }}>
          {imageUrls.map((_, imgIdx) => (
            <div key={imgIdx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: "#aaa", fontWeight: 700, minWidth: 16 }}>{imgIdx + 1}</span>
              <input
                value={urls[imgIdx] || ""}
                placeholder={`Slide ${imgIdx + 1} link...`}
                onChange={e => onUrlChange(imgIdx, e.target.value)}
                style={{ flex: 1, padding: "5px 8px", border: "1.5px solid #e0e0e0", borderRadius: 5, fontSize: 11, outline: "none", fontFamily: "inherit", background: "white", color: "#111" }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function DropZone({ isDropTarget, label, onDragOver, onDragLeave, onDrop, onFileInput, urlValue, onUrlChange, compact }) {
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

function CalendarPage({ posts, allPosts, clientName, month, year, onUpdatePost, onSwapPosts, postsPerPage }) {
  const [notes, setNotes] = useState("");
  const feedPosts = allPosts.filter(p => p.contentType !== "Story");
  return (
    <div className="cal-page" style={{ background: "white", borderRadius: 0, boxShadow: "none", padding: "48px 56px", marginBottom: 0, border: "1px solid #e8e8e8" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 40, borderBottom: "1px solid #eee", paddingBottom: 16 }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 400, fontSize: 52, color: "#111", lineHeight: 1 }}>
          {MONTHS[month]} {year} &nbsp;<em>| Content Calendar</em>
        </h1>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 400, fontSize: 48, color: "#222" }}>{clientName}</h2>
      </div>
      <div style={{ display: "flex", gap: 20, alignItems: "stretch" }}>
      <div style={{ flex: 1, display: "flex", gap: 18, alignItems: "stretch" }}>
          {posts.map((post, i) => (
            <div key={i} style={{ flex: "0 0 auto", width: `calc((100% - ${(postsPerPage - 1) * 18}px) / ${postsPerPage})`, display: "flex" }}>
            <PostCard post={post} month={month} year={year} onUpdate={(field, val) => onUpdatePost(post.day, post.postIdx ?? i, field, val)} />
          </div>
          ))}
          {/* Ghost spacers so partial pages stay the right size */}
          {Array.from({ length: postsPerPage - posts.length }).map((_, i) => (
            <div key={`ghost-${i}`} style={{ flex: "0 0 auto", width: `calc((100% - ${(postsPerPage - 1) * 18}px) / ${postsPerPage})`, visibility: "hidden" }}>
              <div style={{ aspectRatio: "4 / 5", background: "transparent" }} />
            </div>
          ))}
        </div>
        <div style={{ width: 270, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ border: "1.5px solid #e8e8e8", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#333", marginBottom: 8 }}>Notes:</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5} placeholder="Add notes..." style={{ width: "100%", border: "none", outline: "none", resize: "none", fontSize: 13, color: "#444", fontFamily: "inherit", lineHeight: 1.6, background: "white", borderRadius: 4, padding: "4px 0" }} />
          </div>
          <ReorderFeedGrid allPosts={feedPosts} onSwap={onSwapPosts} />
        </div>
      </div>
      <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid #f0f0f0", textAlign: "right", fontSize: 9, color: "#ccc", letterSpacing: "0.04em" }}>
        © 2026 Loudmouth. All rights reserved.
      </div>
    </div>
  );
}

// ── Reorderable Feed Grid ──
function ReorderFeedGrid({ allPosts, onSwap }) {
  const [dragSrc, setDragSrc] = useState(null); // { day, postIdx }
  const [hoverTarget, setHoverTarget] = useState(null);

  const postsWithImages = allPosts.filter(p => p?.imageUrls?.[0] || p?.placeholder);
  const reversed = [...postsWithImages].reverse();
  const cells = [];
  while (cells.length + reversed.length < 12) cells.push(null);
  cells.push(...reversed);

  return (
    <div style={{ border: "1.5px solid #e8e8e8", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>Feed:</div>
        <div className="no-print" style={{ fontSize: 9, color: "#bbb", letterSpacing: "0.04em" }}>drag to reorder</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
        {cells.slice(0, 12).map((post, i) => {
          const isTarget = hoverTarget === i && dragSrc !== null && post !== null;
          return (
            <div
              key={i}
              draggable={!!post}
              onDragStart={() => post && setDragSrc({ day: post.day, postIdx: post.postIdx ?? 0, cellIdx: i })}
              onDragOver={e => { e.preventDefault(); if (post) setHoverTarget(i); }}
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
              style={{
                aspectRatio: "4 / 5", background: "#eeeeee", borderRadius: 0, overflow: "hidden",
                cursor: post ? "grab" : "default",
                outline: isTarget ? "2px solid #1a1a2e" : "none",
                opacity: dragSrc && dragSrc.cellIdx === i ? 0.5 : 1,
                transition: "outline 0.1s, opacity 0.1s",
                position: "relative",
              }}
            >
              {post?.imageUrls?.[0] ? (
                <>
                  <img src={post.imageUrls[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
                  {/* Date label on hover */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.55)", color: "white", fontSize: 7, padding: "2px 3px", textAlign: "center", fontWeight: 700, opacity: isTarget ? 1 : 0, transition: "opacity 0.15s" }}>
                    {formatDate(post.day ? new Date().getMonth() : 0, post.day)}
                  </div>
                </>
              ) : (
                <div style={{ width: "100%", height: "100%", background: i % 3 === 0 ? "#e5e5e5" : i % 3 === 1 ? "#ebebeb" : "#e8e8e8" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PostCard({ post, month, year, onUpdate }) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [reframing, setReframing] = useState(false);
  const [dropHighlight, setDropHighlight] = useState(false);
  const [hovering, setHovering] = useState(false);
  const isReel = post.contentType === "Reel";
  const isCarousel = post.contentType === "Carousel";
  const totalSlides = post.imageUrls?.length || 0;
  const currentSlide = Math.min(slideIdx, Math.max(0, totalSlides - 1));
  const mainImage = isCarousel ? post.imageUrls?.[currentSlide] : post.imageUrls?.[0];
  const dayName = getDayName(year, month, post.day);
  const dateStr = formatDate(month, post.day);

  function handleReplaceFiles(files) {
    const file = [...files].find(f => f.type.startsWith("image/"));
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (isCarousel) {
        const newUrls = [...(post.imageUrls || [])];
        newUrls[currentSlide] = ev.target.result;
        onUpdate("imageUrls", newUrls);
      } else {
        onUpdate("imageUrls", [ev.target.result]);
      }
    };
    reader.readAsDataURL(file);
    setReframing(false);
  }

  function handleDelete() {
    if (isCarousel) {
      const newUrls = post.imageUrls.filter((_, i) => i !== currentSlide);
      onUpdate("imageUrls", newUrls);
      if (newUrls.length === 0) onUpdate("contentType", "Photo");
      setSlideIdx(Math.max(0, currentSlide - 1));
    } else {
      onUpdate("imageUrls", []);
    }
  }

  const linkHref = isCarousel ? (post.urls?.[currentSlide] || post.url) : isReel ? (post.urls?.[0] || post.url) : post.url;

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
      <div style={{ background: "#1a1a2e", color: "white", borderRadius: 24, padding: "5px 0", textAlign: "center", fontSize: 12, fontWeight: 700 }}>
        {dayName} {dateStr}
      </div>
      <div
        style={{ position: "relative" }}
        onDoubleClick={() => mainImage && setReframing(r => !r)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onDragOver={e => { e.preventDefault(); setDropHighlight(true); }}
        onDragLeave={() => setDropHighlight(false)}
        onDrop={e => { e.preventDefault(); setDropHighlight(false); handleReplaceFiles(e.dataTransfer.files); }}
      >
        <div style={{ outline: reframing ? "2px solid #D7FA06" : "none", borderRadius: 8, transition: "outline 0.15s" }}>
          <DraggableImage src={mainImage} cropX={post.cropX ?? 50} cropY={post.cropY ?? 50} scale={post.scale ?? 1} onUpdate={onUpdate} isCarousel={isCarousel} imageUrls={post.imageUrls} isVideo={isReel} placeholder={post.placeholder} />
        </div>
        {dropHighlight && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(26,26,46,0.5)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 15 }}>
            <span style={{ color: "#D7FA06", fontWeight: 700, fontSize: 12 }}>Drop to replace</span>
          </div>
        )}
        {reframing && (
          <div
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.78)", borderBottomLeftRadius: 8, borderBottomRightRadius: 8, padding: "8px 12px", zIndex: 20, display: "flex", flexDirection: "column", gap: 5 }}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", minWidth: 28 }}>zoom</span>
              <input type="range" min="1" max="3" step="0.05"
                value={post.scale ?? 1}
                onChange={e => onUpdate("scale", parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: "#D7FA06", cursor: "pointer", height: 3 }}
              />
              <span style={{ fontSize: 9, color: "#D7FA06", minWidth: 28, textAlign: "right" }}>{Math.round((post.scale ?? 1) * 100)}%</span>
            </div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>drag to reposition · dbl-click to exit</div>
          </div>
        )}
        {mainImage && hovering && (
          <button
            onClick={e => { e.stopPropagation(); handleDelete(); }}
            title="Delete photo"
            style={{ position: "absolute", top: 6, right: 6, background: "transparent", color: "white", border: "none", borderRadius: "50%", width: 22, height: 22, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, lineHeight: 1, textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
          >✕</button>
        )}
        {isCarousel && totalSlides > 1 && (
          <>
            <button onClick={() => setSlideIdx(i => Math.max(0, i - 1))} disabled={currentSlide === 0} style={{ position: "absolute", left: -13, top: "50%", transform: "translateY(-50%)", background: currentSlide === 0 ? "#e8e8e8" : "#1a1a2e", color: currentSlide === 0 ? "#bbb" : "white", border: "none", borderRadius: "50%", width: 26, height: 26, fontSize: 14, cursor: currentSlide === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", zIndex: 10 }}>‹</button>
            <button onClick={() => setSlideIdx(i => Math.min(totalSlides - 1, i + 1))} disabled={currentSlide === totalSlides - 1} style={{ position: "absolute", right: -13, top: "50%", transform: "translateY(-50%)", background: currentSlide === totalSlides - 1 ? "#e8e8e8" : "#1a1a2e", color: currentSlide === totalSlides - 1 ? "#bbb" : "white", border: "none", borderRadius: "50%", width: 26, height: 26, fontSize: 14, cursor: currentSlide === totalSlides - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", zIndex: 10 }}>›</button>
            <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 5, zIndex: 10 }}>
              {post.imageUrls.map((_, i) => (
                <div key={i} onClick={() => setSlideIdx(i)} style={{ width: i === currentSlide ? 16 : 6, height: 6, borderRadius: 3, background: i === currentSlide ? "white" : "rgba(255,255,255,0.5)", transition: "all 0.2s", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              ))}
            </div>
          </>
        )}
      </div>
      <a href={linkHref || "#"} target="_blank" rel="noreferrer" style={{ background: "#1a1a2e", color: "white", borderRadius: 24, padding: "6px 0", textAlign: "center", fontSize: 11, fontWeight: 700, textDecoration: "underline", display: "block", cursor: "pointer" }}>
        {isReel ? "Reel Link" : isCarousel ? `Slide ${currentSlide + 1} Link` : "Photo Link"}
      </a>
      <div style={{ border: "1.5px solid #e8e8e8", borderRadius: 8, padding: "14px 16px", flex: 1, minHeight: 160 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#333", marginBottom: 10 }}>Caption:</div>
        <textarea value={post.caption || ""} onChange={e => onUpdate("caption", e.target.value)} placeholder="Caption..." rows={4} style={{ fontSize: 13, color: "#444", lineHeight: 1.7, width: "100%", border: "none", outline: "none", resize: "none", fontFamily: "inherit", background: "transparent", padding: 0 }} />
      </div>
    </div>
  );
}