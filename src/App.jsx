import { useState, useMemo, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { supabase } from "./supabase";

const CLOUDINARY_CLOUD = "djaxz6tef";
const CLOUDINARY_PRESET = "loudmouth_uploads";

async function compressToBlob(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 3000;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => resolve(blob), "image/jpeg", 0.95);
    };
    img.src = url;
  });
}

async function uploadToCloudinary(fileOrBlob) {
  const form = new FormData();
  form.append("file", fileOrBlob);
  form.append("upload_preset", CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: "POST", body: form });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.secure_url;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CONTENT_TYPES = ["Photo", "Reel", "Carousel", "Story"];
const DEFAULT_CLIENTS = [];
const DEFAULT_BUILDERS = [];

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
  return { id: Date.now() + Math.random(), contentType: "Photo", imageUrls: [], url: "", urls: [], videoUrl: "", caption: "", cropX: 50, cropY: 50, scale: 1, placeholder: "", postingNotes: "" };
}
const CONTENT_FIELDS = ["contentType", "imageUrls", "url", "urls", "videoUrl", "caption", "cropX", "cropY", "scale", "placeholder", "postingNotes"];

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
                }}onMouseEnter={e => e.currentTarget.style.background = "#f0f0f0"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >{d}</div>
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

export default function App() {
  const today = new Date();
  const [step, setStep] = useState(1);
  const [clientName, setClientName] = useState("");
  const [clients, setClients] = useState(() => {
    try { const s = localStorage.getItem("lm_clients"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [builders, setBuilders] = useState(() => {
    try { const s = localStorage.getItem("lm_builders"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [builderName, setBuilderName] = useState("");
  const [addingBuilder, setAddingBuilder] = useState(false);
  const [newBuilderInput, setNewBuilderInput] = useState("");
  const [editingBuilders, setEditingBuilders] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [newClientInput, setNewClientInput] = useState("");
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [postsPerPage, setPostsPerPage] = useState(3);
  const [selectedDays, setSelectedDays] = useState([]);
  const [posts, setPosts] = useState({});
  const [dragOver, setDragOver] = useState(null);
  const [driveToken, setDriveToken] = useState(null);
const [linkPickMode, setLinkPickMode] = useState({ active: false, onPick: null });
const [driveOpen, setDriveOpen] = useState(false);
const [drivePanelWidth, setDrivePanelWidth] = useState(300);
const [driveUploadProgress, setDriveUploadProgress] = useState({ active: false, done: 0, total: 0, day: null, postIdx: null });
  const [drafts, setDrafts] = useState([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login"); // "login" | "signup"
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);
  const [allCalendars, setAllCalendars] = useState([]);
  const [currentCalendarId, setCurrentCalendarId] = useState(null);
  const [draftHistory, setDraftHistory] = useState([]);
  const [showDraftHistory, setShowDraftHistory] = useState(false);
  const [savingLabel, setSavingLabel] = useState("");
  const historyRef = useRef([]);
  const historyIdxRef = useRef(-1);
  const isUndoingRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [profileName, setProfileName] = useState("");
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileInput, setProfileInput] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);

  useEffect(() => {
    document.body.style.background = "#f4f4f0";
    document.body.style.margin = "0";
  }, []);

  useEffect(() => {
    if (!driveOpen) return;
    function handler(e) {
      if (e.target.closest("[data-drive-panel]")) return;
      if (e.target.closest("[data-drive-toggle]")) return;
      setDriveOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [driveOpen]);

  useEffect(() => {
    if (isUndoingRef.current) return;
    const timer = setTimeout(() => {
      const snap = JSON.stringify({ posts, selectedDays, clientName, month, year, postsPerPage });
      const history = historyRef.current;
      if (history[historyIdxRef.current] === snap) return;
      history.splice(historyIdxRef.current + 1);
      history.push(snap);
      if (history.length > 15) history.shift();
      historyIdxRef.current = history.length - 1;
      setCanUndo(historyIdxRef.current > 0);
      setCanRedo(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [posts, selectedDays, clientName, month, year, postsPerPage]);

  function restoreSnap(snap) {
    isUndoingRef.current = true;
    setPosts(snap.posts); setSelectedDays(snap.selectedDays);
    setClientName(snap.clientName); setMonth(snap.month);
    setYear(snap.year); setPostsPerPage(snap.postsPerPage);
    setTimeout(() => { isUndoingRef.current = false; }, 200);
  }

  function undo() {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    restoreSnap(JSON.parse(historyRef.current[historyIdxRef.current]));
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(true);
  }

  function redo() {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current++;
    restoreSnap(JSON.parse(historyRef.current[historyIdxRef.current]));
    setCanUndo(true);
    setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
  }

  function resetCalendar() {
    // push current state first so reset is undoable
    const snap = JSON.stringify({ posts, selectedDays, clientName, month, year, postsPerPage });
    historyRef.current.splice(historyIdxRef.current + 1);
    historyRef.current.push(snap);
    historyIdxRef.current = historyRef.current.length - 1;
    // now reset
    setSelectedDays([]); setPosts({}); setClientName("");
    setMonth(today.getMonth()); setYear(today.getFullYear());
    setPostsPerPage(3); setStep(1);
  }
  
  const [exporting, setExporting] = useState(false);
  const [editingClients, setEditingClients] = useState(false);

  function connectDrive() {
    if (!window.google?.accounts?.oauth2) {
      return alert("Google auth not loaded yet — wait a second and try again.");
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: "988412963391-j36f4j6or67871i599o17ui2nai59pi9.apps.googleusercontent.com",
      scope: "https://www.googleapis.com/auth/drive.readonly",
      callback: (response) => {
        if (response.access_token) {
          setDriveToken(response.access_token);
          setDriveOpen(true);
        }
      },
    });
    client.requestAccessToken();
  }

  async function fetchDriveUrls(fileInfos, onProgress) {
    return Promise.all(fileInfos.map(async fi => {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fi.id}?alt=media`, { headers: { Authorization: `Bearer ${driveToken}` } });
      if (!res.ok) throw new Error(`Fetch failed for ${fi.id}`);
      const blob = await res.blob();
      const compressed = await compressToBlob(new File([blob], "drive-img.jpg", { type: blob.type }));
      const url = await uploadToCloudinary(compressed);
      if (onProgress) onProgress();
      return url;
    }));
  }

  async function handleDriveFileDrop(day, postIdx, fileId, driveLink = "") {
    await handleMultiDriveFileDrop(day, postIdx, [{ id: fileId, link: driveLink }]);
  }

  async function handleMultiDriveFileDrop(day, postIdx, fileInfos) {
    if (!driveToken || !fileInfos.length) return;
    try {
      setDriveUploadProgress({ active: true, done: 0, total: fileInfos.length, day, postIdx });
      const urls = await fetchDriveUrls(fileInfos, () => setDriveUploadProgress(p => ({ ...p, done: p.done + 1 })));
      setPosts(p => {
        const arr = [...(p[day] || [])];
        const post = { ...arr[postIdx] };
        const wasCarousel = post.contentType === "Carousel";
        post.imageUrls = [...(post.imageUrls || []), ...urls];
        if (post.imageUrls.length > 1) {
          post.contentType = "Carousel";
          const existingSlideLinks = wasCarousel ? (post.urls || []) : (post.url ? [post.url] : []);
          const newSlideLinks = fileInfos.map(fi => fi.link || "");
          post.urls = [...existingSlideLinks, ...newSlideLinks];
        } else {
          if (fileInfos[0].link && !post.url) post.url = fileInfos[0].link;
        }
        arr[postIdx] = post;
        return { ...p, [day]: arr };
      });
    } catch (e) { alert("Drive drop failed: " + e.message); }
    finally { setDriveUploadProgress({ active: false, done: 0, total: 0 }); }
  }

  async function handleDriveBatchImport(fileInfos) {
    if (!driveToken || !fileInfos.length) return;
    try {
      setDriveUploadProgress({ active: true, done: 0, total: fileInfos.length, day: null, postIdx: null });
      const urls = await fetchDriveUrls(fileInfos, () => setDriveUploadProgress(p => ({ ...p, done: p.done + 1 })));
      const newDays = [];
      setPosts(p => {
        const next = { ...p };
        let queue = [...urls];
        const days = [...selectedDays].sort((a, b) => a - b);
        for (const day of days) {
          if (!queue.length) break;
          const arr = [...(next[day] || [])];
          if (arr.length === 1 && !arr[0].imageUrls?.length) { arr[0] = { ...arr[0], imageUrls: [queue.shift()] }; next[day] = arr; }
        }
        if (queue.length > 0) {
          const usedDays = new Set([...selectedDays, ...newDays]);
          const totalDays = getDaysInMonth(year, month);
          const lastDay = Math.max(...selectedDays, 0);
          for (let d = lastDay + 1; d <= totalDays && queue.length > 0; d++) {
            if (!usedDays.has(d)) { usedDays.add(d); newDays.push(d); next[d] = [{ ...newPost(), imageUrls: [queue.shift()] }]; }
          }
        }
        return next;
      });
      if (newDays.length > 0) setSelectedDays(prev => [...new Set([...prev, ...newDays])]);
    } catch (e) { alert("Drive batch import failed: " + e.message); }
    finally { setDriveUploadProgress({ active: false, done: 0, total: 0 }); }
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

  async function handleFiles(day, postIdx, files) {
    const imageFiles = [...files].filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    const forceCarousel = imageFiles.length > 1;
    try {
      setDriveUploadProgress({ active: true, done: 0, total: imageFiles.length, day, postIdx });
      const urls = await Promise.all(imageFiles.map(async file => {
        const blob = await compressToBlob(file);
        const url = await uploadToCloudinary(blob);
        setDriveUploadProgress(p => ({ ...p, done: p.done + 1 }));
        return url;
      }));
      setPosts(p => {
        const arr = [...(p[day] || [])];
        const post = { ...arr[postIdx] };
        if (forceCarousel || post.contentType === "Carousel") {
          post.contentType = "Carousel";
          post.imageUrls = [...(post.imageUrls || []), ...urls];
        } else {
          post.imageUrls = [urls[0]];
        }
        arr[postIdx] = post;
        return { ...p, [day]: arr };
      });
    } catch(e) { alert("Upload failed: " + e.message); }
    finally { setDriveUploadProgress({ active: false, done: 0, total: 0 }); }
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

  async function handleBatchImport(files) {
    const imageFiles = [...files].filter(f => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    let dataUrls;
    try {
      setDriveUploadProgress({ active: true, done: 0, total: imageFiles.length, day: null, postIdx: null });
      const urls = await Promise.all(imageFiles.map(async file => {
        const blob = await compressToBlob(file);
        const url = await uploadToCloudinary(blob);
        setDriveUploadProgress(p => ({ ...p, done: p.done + 1 }));
        return url;
      }));
    } catch(e) {
      alert("Upload failed: " + e.message);
      setDriveUploadProgress({ active: false, done: 0, total: 0 });
      return;
    }
    {
      const newDays = [];
      setPosts(p => {
        const next = { ...p };
        let queue = [...dataUrls];
        // Use existing days that only have one post with no image (one slot per day)
        const days = [...selectedDays].sort((a, b) => a - b);
        for (const day of days) {
          if (!queue.length) break;
          const arr = [...(next[day] || [])];
          // Only use this day if it has exactly one post and no image yet
          if (arr.length === 1 && !arr[0].imageUrls?.length) {
            arr[0] = { ...arr[0], imageUrls: [queue.shift()] };
            next[day] = arr;
          }
        }
        // For remaining images, pick days chronologically after the last selected day
        if (queue.length > 0) {
          const usedDays = new Set([...selectedDays, ...newDays]);
          const totalDays = getDaysInMonth(year, month);
          const lastDay = Math.max(...selectedDays, 0);
          for (let d = lastDay + 1; d <= totalDays && queue.length > 0; d++) {
            if (!usedDays.has(d)) {
              usedDays.add(d);
              newDays.push(d);
              next[d] = [{ ...newPost(), imageUrls: [queue.shift()] }];
            }
          }
        }
        return next;
      });
      // Add any new days to selectedDays
      if (newDays.length > 0) {
        setSelectedDays(prev => [...new Set([...prev, ...newDays])]);
      }
    }
    setDriveUploadProgress({ active: false, done: 0, total: 0 });
  }

  function addNewClient() {
    const name = newClientInput.trim();
    if (!name) return;
    setClients(prev => {
      const next = [...prev, name];
      localStorage.setItem("lm_clients", JSON.stringify(next));
      return next;
    });
    setClientName(name);
    setNewClientInput("");
    setAddingClient(false);
  }

  async function exportPDF() {
    // Inject CSS to hide UI-only elements and inject exporting class
    const style = document.createElement("style");
    style.id = "pdf-export-style";
    style.textContent = `.no-print { display: none !important; } .no-export { display: none !important; } .feed-header { justify-content: center !important; } .feed-label { font-size: 11px !important; } @keyframes spin { from { stroke-dashoffset: 34.5; transform: rotate(0deg); } to { stroke-dashoffset: 0; transform: rotate(360deg); } }`;
    document.head.appendChild(style);
    setExporting(true);
    // Wait for React to re-render with exporting=true
    await new Promise(r => setTimeout(r, 80));
    try {
      const pages = document.querySelectorAll(".cal-page");
      if (!pages.length) return;
      const total = pages.length;
      setExportProgress({ current: 0, total });
      const w = pages[0].offsetWidth;
      const h = pages[0].offsetHeight;
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [w, h] });
      for (let i = 0; i < pages.length; i++) {
        setExportProgress({ current: i + 1, total });
        const canvas = await html2canvas(pages[i], { scale: 3, useCORS: true, allowTaint: true, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/png");
        if (i > 0) pdf.addPage([w, h], "landscape");
        pdf.addImage(imgData, "PNG", 0, 0, w, h);
      }
      pdf.save(`${clientName || "calendar"}-content-calendar.pdf`);
    } finally {
      setExporting(false);
      setExportProgress({ current: 0, total: 0 });
      document.head.removeChild(style);
    }
  }

  // ── Auth ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) {
        const name = session.user.user_metadata?.display_name || "";
        setProfileName(name);
        if (!name) setShowProfileSetup(true);
        loadAllCalendars();
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const name = session.user.user_metadata?.display_name || "";
        setProfileName(name);
        if (!name) setShowProfileSetup(true);
        loadAllCalendars();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signIn() {
    setAuthBusy(true); setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    if (error) setAuthError(error.message);
    setAuthBusy(false);
  }

  async function signUp() {
    setAuthBusy(true); setAuthError("");
    const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
    if (error) setAuthError(error.message);
    else setAuthError("Check your email for a confirmation link!");
    setAuthBusy(false);
  }

  async function resetPassword() {
    if (!authEmail.trim()) return setAuthError("Enter your email first.");
    setAuthBusy(true); setAuthError("");
    const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
      redirectTo: window.location.origin,
    });
    if (error) setAuthError(error.message);
    else setAuthError("Password reset email sent! Check your inbox.");
    setAuthBusy(false);
  }

  async function saveProfile() {
    const name = profileInput.trim();
    if (!name) return;
    const { error } = await supabase.auth.updateUser({ data: { display_name: name } });
    if (error) return alert("Failed to save: " + error.message);
    setProfileName(name);
    setShowProfileSetup(false);
    setEditingProfile(false);
    setProfileInput("");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null); setShowDashboard(true); setAllCalendars([]);
    setCurrentCalendarId(null); setClientName(""); setSelectedDays([]); setPosts({});
  }

  // ── Calendars ──
  async function loadAllCalendars() {
    const { data } = await supabase.from("calendars").select("*").order("updated_at", { ascending: false });
    setAllCalendars(data || []);
  }

  async function openCalendar(cal) {
    setCurrentCalendarId(cal.id);
    setClientName(cal.client_name);
    setMonth(cal.month);
    setYear(cal.year);
    setPostsPerPage(cal.posts_per_page);
    setBuilderName(cal.builder_name || "");
    setSelectedDays(cal.selected_days || []);
    // Load most recent draft
    const { data } = await supabase.from("calendar_drafts")
      .select("*").eq("calendar_id", cal.id).order("saved_at", { ascending: false }).limit(1);
    if (data?.[0]) setPosts(data[0].posts);
    setShowDashboard(false);
    setStep(1);
    loadDraftHistory(cal.id);
  }

  async function loadDraftHistory(calId) {
    const id = calId || currentCalendarId;
    if (!id) return;
    const { data } = await supabase.from("calendar_drafts")
      .select("*").eq("calendar_id", id).order("saved_at", { ascending: false }).limit(20);
    setDraftHistory(data || []);
  }

  async function saveDraft(label = "") {
    if (!clientName.trim()) return alert("Please select a client first.");
    if (!user) return alert("Please log in first.");
    const lbl = label || savingLabel || "Manual save";
    // Upsert the calendar record
    const { data: calData, error: calErr } = await supabase.from("calendars").upsert({
      user_id: user.id, client_name: clientName, month, year,
      posts_per_page: postsPerPage, builder_name: profileName,
      selected_days: selectedDays, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,client_name,month,year" }).select().single();
    if (calErr) return alert("Save failed: " + calErr.message);
    setCurrentCalendarId(calData.id);
    // Insert a draft snapshot
    await supabase.from("calendar_drafts").insert({
      calendar_id: calData.id, posts, label: lbl,
    });
    await loadAllCalendars();
    await loadDraftHistory(calData.id);
    setSavingLabel("");
    alert(`Saved: ${clientName} — ${MONTHS[month]} ${year}`);
  }

  async function restoreDraft(draft) {
    if (!window.confirm(`Restore draft from ${new Date(draft.saved_at).toLocaleString()}?`)) return;
    setPosts(draft.posts);
    setShowDraftHistory(false);
  }

  async function deleteCalendar(cal) {
    if (!window.confirm(`Delete all saved data for "${cal.client_name} — ${MONTHS[cal.month]} ${cal.year}"?`)) return;
    await supabase.from("calendars").delete().eq("id", cal.id);
    await loadAllCalendars();
    if (currentCalendarId === cal.id) {
      setCurrentCalendarId(null); setShowDashboard(true);
    }
  }

  async function newCalendar() {
    // Check for duplicate
    if (clientName.trim()) {
      const existing = allCalendars.find(c =>
        c.client_name === clientName && c.month === month && c.year === year
      );
      if (existing) {
        if (window.confirm(`A calendar for ${clientName} — ${MONTHS[month]} ${year} already exists. Open it?`)) {
          openCalendar(existing);
        }
        return;
      }
    }
    setCurrentCalendarId(null);
    setClientName(""); setSelectedDays([]); setPosts({});
    setMonth(today.getMonth()); setYear(today.getFullYear());
    setPostsPerPage(3); setStep(1); setShowDashboard(false);
  }

  const stepLabels = ["Setup", "Pick Days", "Content", "Preview"];

  if (authLoading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#1a1a2e", color: "#D7FA06", fontSize: 16, fontWeight: 700, letterSpacing: "0.08em" }}>LOADING...</div>;

  if (!user) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#1a1a2e", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ background: "white", borderRadius: 16, padding: 40, width: 360, boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
      <div style={{ marginBottom: 28, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: "0.08em", color: "#1a1a2e", whiteSpace: "nowrap" }}>SMM CALENDAR CREATOR</div>
          <div style={{ fontSize: 11, color: "#aaa", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>by LOUDMOUTH CREATIVE</div>
        </div>
        <div style={{ display: "flex", gap: 0, marginBottom: 24, border: "1.5px solid #e0e0e0", borderRadius: 8, overflow: "hidden" }}>
          <button onClick={() => setAuthMode("login")} style={{ flex: 1, padding: "9px 0", background: authMode === "login" ? "#1a1a2e" : "white", color: authMode === "login" ? "#D7FA06" : "#aaa", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Log In</button>
          <button onClick={() => setAuthMode("signup")} style={{ flex: 1, padding: "9px 0", background: authMode === "signup" ? "#1a1a2e" : "white", color: authMode === "signup" ? "#D7FA06" : "#aaa", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Sign Up</button>
        </div>
        <input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, marginBottom: 10, outline: "none", boxSizing: "border-box" }} />
        <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && (authMode === "login" ? signIn() : signUp())} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 13, marginBottom: 16, outline: "none", boxSizing: "border-box" }} />
        {authError && <div style={{ fontSize: 12, color: authError.includes("Check") ? "#22aa66" : "#E8001C", marginBottom: 12, textAlign: "center" }}>{authError}</div>}
        <button onClick={authMode === "login" ? signIn : signUp} disabled={authBusy} style={{ width: "100%", padding: "12px 0", background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: "pointer", letterSpacing: "0.06em" }}>
          {authBusy ? "..." : authMode === "login" ? "LOG IN" : "CREATE ACCOUNT"}
        </button>
        {authMode === "login" && (
          <button onClick={resetPassword} style={{ background: "none", border: "none", fontSize: 11, color: "#aaa", cursor: "pointer", marginTop: 12, width: "100%", textDecoration: "underline" }}>
            Forgot password?
          </button>
        )}
      </div>
    </div>
  );

  if (showProfileSetup) return (
    <div style={{ minHeight: "100vh", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ background: "white", borderRadius: 16, padding: 40, width: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
      <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: "0.08em", color: "#1a1a2e", whiteSpace: "nowrap" }}>SMM CALENDAR CREATOR</div>
          <div style={{ fontSize: 11, color: "#aaa", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>by LOUDMOUTH CREATIVE</div>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 6 }}>One quick thing.</h2>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>What's your name? This shows up in the calendar footer and on your account.</p>
        <input
          autoFocus
          value={profileInput}
          onChange={e => setProfileInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && saveProfile()}
          placeholder="e.g. Julio Castillo"
          style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16 }}
        />
        <button onClick={saveProfile} disabled={!profileInput.trim()} style={{ width: "100%", padding: "12px 0", background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: profileInput.trim() ? "pointer" : "default", opacity: profileInput.trim() ? 1 : 0.4, letterSpacing: "0.04em" }}>
          Let's go →
        </button>
      </div>
    </div>
  );

  if (showDashboard) return (
    <div style={{ minHeight: "100vh", background: "#f4f4f0", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ background: "#1a1a2e", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, alignItems: "flex-start" }}>
          <div style={{ color: "#D7FA06", fontWeight: 900, fontSize: 16, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>SMM CALENDAR CREATOR</div>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>by LOUDMOUTH CREATIVE</div>
        </div>
        <NavProfileMenu
          profileName={profileName}
          currentCalendarId={null}
          onMyCalendars={() => {}}
          onHistory={() => {}}
          onEditProfile={() => { setProfileInput(profileName); setEditingProfile(true); }}
          onSignOut={signOut}
        />
      </div>
      {exporting && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(15,15,25,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, backdropFilter: "blur(4px)" }}>
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
            <circle cx="24" cy="24" r="20" fill="none" stroke="#D7FA06" strokeWidth="4"
              strokeDasharray="125.6"
              strokeDashoffset={exportProgress.total > 0 ? 125.6 * (1 - exportProgress.current / exportProgress.total) : 100}
              strokeLinecap="round"
              style={{ transformOrigin: "center", transform: "rotate(-90deg)", transition: "stroke-dashoffset 0.4s ease" }}
            />
          </svg>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "white", fontWeight: 700, fontSize: 15, letterSpacing: "0.04em", marginBottom: 6 }}>
              {exportProgress.total > 1 ? `Rendering page ${exportProgress.current} of ${exportProgress.total}...` : "Building your PDF..."}
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>This may take a few seconds</div>
          </div>
        </div>
      )}
      {editingProfile && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => e.target === e.currentTarget && setEditingProfile(false)}>
          <div style={{ background: "white", borderRadius: 14, width: 360, padding: 28, boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>Edit Profile</div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 18 }}>This name appears in calendar footers and your account.</div>
            <input autoFocus value={profileInput} onChange={e => setProfileInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveProfile()} placeholder="Your name..." style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveProfile} style={{ flex: 1, padding: "10px 0", background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Save</button>
              <button onClick={() => setEditingProfile(false)} style={{ padding: "10px 16px", background: "#f0f0f0", color: "#555", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ padding: "40px 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>My Calendars</h1>
          <button onClick={newCalendar} style={{ background: "#1a1a2e", color: "#D7FA06", border: "none", padding: "12px 24px", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", letterSpacing: "0.04em" }}>+ New Calendar</button>
        </div>
        {allCalendars.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#aaa" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📅</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No calendars yet</div>
            <div style={{ fontSize: 13 }}>Hit "+ New Calendar" to get started</div>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {allCalendars.map(cal => (
            <div key={cal.id} style={{ background: "white", borderRadius: 12, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: "1.5px solid #e8e8e8", cursor: "pointer" }} onClick={() => openCalendar(cal)}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{cal.client_name}</div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 14 }}>{MONTHS[cal.month]} {cal.year}</div>
              <div style={{ fontSize: 11, color: "#bbb", marginBottom: 14 }}>Last saved {new Date(cal.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {new Date(cal.updated_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={e => { e.stopPropagation(); openCalendar(cal); }} style={{ flex: 1, background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 7, padding: "8px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Open</button>
                <button onClick={e => { e.stopPropagation(); deleteCalendar(cal); }} style={{ background: "none", border: "1.5px solid #eee", color: "#ccc", borderRadius: 7, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", minHeight: "100vh", background: "#f4f4f0" }}>

      {/* NAV */}
      <nav className="no-print" style={{ background: "#1a1a2e", padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, gap: 24 }}>
        <div onClick={() => setShowDashboard(true)} style={{ display: "flex", flexDirection: "column", lineHeight: 1.1, alignItems: "flex-start", flexShrink: 0, cursor: "pointer" }}>
          <span style={{ color: "#D7FA06", fontWeight: 900, fontSize: 16.5, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>SMM CALENDAR CREATOR</span>
          <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 500, fontSize: 10, letterSpacing: "0.08em" }}>by LOUDMOUTH CREATIVE</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {stepLabels.map((label, i) => {
            const s = i + 1;
            return (
              <button key={s} onClick={() => setStep(s)} style={{
                background: step === s ? "#D7FA06" : "rgba(255,255,255,0.07)",
                color: step === s ? "#111" : "#aaa",
                border: "none", padding: "6px 16px", borderRadius: 20,
                fontSize: 12, cursor: "pointer", fontWeight: 700, transition: "all 0.15s", whiteSpace: "nowrap",
              }}>{s}. {label}</button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
        
        <button onClick={undo} disabled={!canUndo} title="Undo" style={{ background: "rgba(255,255,255,0.08)", color: canUndo ? "#fff" : "#555", border: "none", borderRadius: 7, width: 32, height: 32, fontSize: 15, cursor: canUndo ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>↩</button>
          <button onClick={redo} disabled={!canRedo} title="Redo" style={{ background: "rgba(255,255,255,0.08)", color: canRedo ? "#fff" : "#555", border: "none", borderRadius: 7, width: 32, height: 32, fontSize: 15, cursor: canRedo ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>↪</button>
          <button onClick={() => { if (window.confirm("Reset calendar to blank? You can undo this.")) resetCalendar(); }} title="Reset" style={{ background: "rgba(255,255,255,0.08)", color: "#aaa", border: "none", borderRadius: 7, width: 32, height: 32, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⟲</button>
          {clientName && <SaveMenu onSave={() => saveDraft()} onExport={exportPDF} showExport={step === 4} />}
          <NavProfileMenu
            profileName={profileName}
            currentCalendarId={currentCalendarId}
            onMyCalendars={() => setShowDashboard(true)}
            onHistory={() => { loadDraftHistory(); setShowDraftHistory(true); }}
            onEditProfile={() => { setProfileInput(profileName); setEditingProfile(true); }}
            onSignOut={signOut}
          />
        </div>
        </nav>
        
        {exporting && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(15,15,25,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, backdropFilter: "blur(4px)" }}>
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
            <circle cx="24" cy="24" r="20" fill="none" stroke="#D7FA06" strokeWidth="4"
              strokeDasharray="125.6"
              strokeDashoffset={exportProgress.total > 0 ? 125.6 * (1 - exportProgress.current / exportProgress.total) : 100}
              strokeLinecap="round"
              style={{ transformOrigin: "center", transform: "rotate(-90deg)", transition: "stroke-dashoffset 0.4s ease" }}
            />
          </svg>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "white", fontWeight: 700, fontSize: 15, letterSpacing: "0.04em", marginBottom: 6 }}>
              {exportProgress.total > 1 ? `Rendering page ${exportProgress.current} of ${exportProgress.total}...` : "Building your PDF..."}
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>This may take a few seconds</div>
          </div>
        </div>
      )}
      {editingProfile && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => e.target === e.currentTarget && setEditingProfile(false)}>
          <div style={{ background: "white", borderRadius: 14, width: 360, padding: 28, boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>Edit Profile</div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 18 }}>This name appears in calendar footers and your account.</div>
            <input autoFocus value={profileInput} onChange={e => setProfileInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveProfile()} placeholder="Your name..." style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveProfile} style={{ flex: 1, padding: "10px 0", background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Save</button>
              <button onClick={() => setEditingProfile(false)} style={{ padding: "10px 16px", background: "#f0f0f0", color: "#555", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showDraftHistory && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}
          onClick={e => e.target === e.currentTarget && setShowDraftHistory(false)}>
          <div style={{ background: "white", width: 360, height: "100vh", overflowY: "auto", padding: 24, boxShadow: "-4px 0 24px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Draft History</div>
              <button onClick={() => setShowDraftHistory(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#aaa" }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>Last 20 saves for this calendar. Click any to restore.</div>
            {draftHistory.length === 0 && (
              <div style={{ fontSize: 13, color: "#aaa", textAlign: "center", padding: "40px 0" }}>No saves yet for this calendar.</div>
            )}
            {draftHistory.map(d => (
              <div key={d.id} style={{ border: "1.5px solid #e8e8e8", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#111", marginBottom: 2 }}>{d.label}</div>
                <div style={{ fontSize: 11, color: "#aaa", marginBottom: 10 }}>{new Date(d.saved_at).toLocaleString()}</div>
                <button onClick={() => restoreDraft(d)} style={{ width: "100%", background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 6, padding: "7px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Restore this version</button>
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
                <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 6 }}>Setup</h2>
                <p style={{ color: "#999", fontSize: 14, marginBottom: 28 }}>Basic info before we build your calendar.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 640 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Client Name</label>
                    {!addingClient ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <select value={clientName} onChange={e => { if (e.target.value === "__add__") setAddingClient(true); else setClientName(e.target.value); }} style={inputStyle}>
                          <option value="">— Select a client —</option>
                          {clients.map(c => <option key={c} value={c}>{c}</option>)}
                          <option value="__add__">+ Add new client...</option>
                        </select>
                        <button onClick={() => setEditingClients(true)} style={{ background: "none", border: "none", fontSize: 11, color: "#aaa", cursor: "pointer", textAlign: "left", padding: 0, textDecoration: "underline" }}>Edit client list</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8 }}>
                        <input autoFocus value={newClientInput} onChange={e => setNewClientInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addNewClient()} placeholder="Type new client name..." style={inputStyle} />
                        <button onClick={addNewClient} style={{ ...primaryBtn, marginTop: 0, padding: "9px 18px", whiteSpace: "nowrap", fontSize: 13 }}>Add</button>
                        <button onClick={() => { setAddingClient(false); setNewClientInput(""); }} style={{ ...secondaryBtn, padding: "9px 14px", whiteSpace: "nowrap" }}>Cancel</button>
                      </div>
                    )}
                    {editingClients && (
                      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
                        onClick={e => e.target === e.currentTarget && setEditingClients(false)}>
                        <div style={{ background: "white", borderRadius: 14, width: 380, padding: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <div style={{ fontWeight: 800, fontSize: 16 }}>Edit Client List</div>
                            <button onClick={() => setEditingClients(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#aaa" }}>✕</button>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                            {clients.map(c => (
                              <div key={c} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#f8f8f8", borderRadius: 8, border: "1px solid #eee" }}>
                                <span style={{ flex: 1, fontSize: 13, color: "#333" }}>{c}</span>
                                <button onClick={() => {
                                  const newName = prompt("Rename:", c);
                                  if (!newName || newName.trim() === c) return;
                                  setClients(prev => { const next = prev.map(x => x === c ? newName.trim() : x); localStorage.setItem("lm_clients", JSON.stringify(next)); return next; });
                                  if (clientName === c) setClientName(newName.trim());
                                }} style={{ background: "#f0f0f0", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", color: "#555", fontWeight: 600 }}>Rename</button>
                                <button onClick={() => {
                                  if (!window.confirm(`Delete "${c}"?`)) return;
                                  setClients(prev => { const next = prev.filter(x => x !== c); localStorage.setItem("lm_clients", JSON.stringify(next)); return next; });
                                  if (clientName === c) setClientName("");
                                }} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#ccc" }}>✕</button>
                              </div>
                            ))}
                          </div>
                          <button onClick={() => setEditingClients(false)} style={{ ...primaryBtn, width: "100%", marginTop: 16, padding: "10px 0", textAlign: "center" }}>Done</button>
                        </div>
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
                <button onClick={() => setStep(2)} disabled={!clientName.trim()} style={{ ...primaryBtn, marginTop: 24, opacity: clientName.trim() ? 1 : 0.4 }}>
                  Next: Pick Posting Days &#8594;
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
                        }} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, padding: "4px 0", cursor: "pointer", color: allSelected ? "#1a1a2e" : "#bbb", borderRadius: 4, userSelect: "none", transition: "background 0.1s" }}
                        title={`Select all ${["Sundays","Mondays","Tuesdays","Wednesdays","Thursdays","Fridays","Saturdays"][colIdx]}`}
                        onMouseEnter={e => e.currentTarget.style.background = "#f0f0ee"}
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
                                  <select value={post.contentType} onChange={e => {
  const newType = e.target.value;
  if (newType === "Carousel" && post.contentType !== "Carousel" && post.url && !(post.urls?.length)) {
    updatePost(day, postIdx, "urls", [post.url]);
  }
  updatePost(day, postIdx, "contentType", newType);
}} style={{ ...inputStyle, width: "auto", padding: "5px 10px", fontSize: 12 }}>
                                    {CONTENT_TYPES.map(t => <option key={t}>{t}</option>)}
                                  </select>
                                  {isCarousel && <span style={{ fontSize: 11, background: "#f0f4ff", color: "#555", padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>{post.imageUrls?.length || 0} image{post.imageUrls?.length !== 1 ? "s" : ""}</span>}
                                  {dayPosts.length > 1 && <button onClick={() => removePostFromDay(day, postIdx)} style={{ marginLeft: "auto", background: "none", border: "1px solid #eee", color: "#ccc", cursor: "pointer", fontSize: 13, borderRadius: 5, padding: "2px 8px", lineHeight: 1.5 }}>✕ Remove</button>}
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                  <div style={{ position: "relative" }}>
                                    {driveUploadProgress.active && driveUploadProgress.day === day && driveUploadProgress.postIdx === postIdx && (
                                      <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.92)", borderRadius: 8, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                                        <div style={{ width: 38, height: 38, border: "3.5px solid #e8e8e8", borderTop: "3.5px solid #1a1a2e", borderRadius: "50%", animation: "cardSpin 0.75s linear infinite" }} />
                                        <span style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.06em" }}>
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
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "2px dashed #e0e0e0", borderRadius: 7, background: "#fafafa" }}>
                                          <img src={post.imageUrls[0]} alt="" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
                                          <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 12, color: "#333", fontWeight: 600 }}>Image uploaded ✓</div>
                                            <div style={{ fontSize: 10, color: "#aaa" }}>Drop to replace</div>
                                          </div>
                                          <button onClick={() => updatePost(day, postIdx, "imageUrls", [])} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 18, padding: 0 }}>✕</button>
                                        </div>
                                      ) : (
                                        <>{post.placeholder ? (
                                          <div style={{ position: "relative", background: "#FFF9C4", border: "1.5px solid #F0E060", borderRadius: 8, padding: "14px 16px", boxShadow: "2px 3px 10px rgba(0,0,0,0.07)", minHeight: 90, display: "flex", flexDirection: "column", gap: 8 }}>
                                            <div style={{ fontSize: 11, color: "#bba000", fontWeight: 700, letterSpacing: "0.04em" }}>📝 PLACEHOLDER</div>
                                            <textarea autoFocus value={post.placeholder} onChange={e => updatePost(day, postIdx, "placeholder", e.target.value)} placeholder="e.g. Pending photo · Coming soon · In editing..." rows={3} style={{ width: "100%", background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 12, fontFamily: "'Helvetica Neue', sans-serif", color: "#555", lineHeight: 1.5, padding: 0 }} />
                                            <button onClick={() => updatePost(day, postIdx, "placeholder", "")} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.12)", color: "#888", border: "none", borderRadius: "50%", width: 16, height: 16, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                                          </div>
                                        ) : (
                                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                            <DropZone isDropTarget={isDropTarget} label="Drag & drop or browse" onDragOver={e => { e.preventDefault(); setDragOver(dragKey); }} onDragLeave={() => setDragOver(null)} onDrop={e => { e.preventDefault(); setDragOver(null); const raw = e.dataTransfer.getData("driveFileIds"); if (raw) { handleMultiDriveFileDrop(day, postIdx, JSON.parse(raw)); } else { const did = e.dataTransfer.getData("driveFileId"); const dlink = e.dataTransfer.getData("driveFileLink"); did ? handleDriveFileDrop(day, postIdx, did, dlink) : handleFiles(day, postIdx, e.dataTransfer.files); } }} onFileInput={e => handleFiles(day, postIdx, e.target.files)} urlValue={post.imageUrls?.[0] || ""} onUrlChange={v => updatePost(day, postIdx, "imageUrls", v ? [v] : [])} />
                                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                              <button onClick={() => updatePost(day, postIdx, "placeholder", "Pending photo")} style={{ width: "100%", padding: "7px 0", background: "#FFFDE7", border: "1.5px dashed #F0E060", borderRadius: 6, fontSize: 11, color: "#aaa", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
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
                                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={e => {
                                          e.preventDefault();
                                          const link = e.dataTransfer.getData("driveFileLink");
                                          if (link) updatePost(day, postIdx, "videoUrl", link);
                                        }}
                                      >
                                        <input
                                          value={post.videoUrl || ""}
                                          placeholder="Paste or pick video link from Drive..."
                                          onChange={e => updatePost(day, postIdx, "videoUrl", e.target.value)}
                                          style={{ ...inputStyle, fontSize: 12, background: post.videoUrl ? "white" : "#fffbe6", border: post.videoUrl ? "1.5px solid #e0e0e0" : "1.5px dashed #f0c040" }}
                                        />
                                        <button
                                          title="Pick from Drive"
                                          onClick={() => {
                                            setDriveOpen(true);
                                            setLinkPickMode({ active: true, onPick: (link) => updatePost(day, postIdx, "videoUrl", link) });
                                          }}
                                          style={{ background: "#1a1a2e", border: "none", color: "#D7FA06", borderRadius: 7, width: 34, height: 34, fontSize: 15, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                                        >📁</button>
                                      </div>
                                    ) : (
                                      <input value={post.url || ""} placeholder="https://..." onChange={e => updatePost(day, postIdx, "url", e.target.value)} style={inputStyle} />
                                    )}
                                    </div>}
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
          <div style={{ width: 420, flexShrink: 0, position: "sticky", top: 80, display: "flex", flexDirection: "column", gap: 16 }}>
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
            {step === 3 && (
              <div style={{ background: "white", border: "1px solid #e8e8e8", borderRadius: 12, padding: "14px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <ReorderFeedGrid
                  allPosts={allPosts.filter(p => p.contentType !== "Story")}
                  onSwap={swapPostContent}
                  onBatchImport={handleBatchImport}
                  onDriveBatchImport={handleDriveBatchImport}
                  driveUploadProgress={driveUploadProgress}
                />
              </div>
            )}

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
            onBatchImport={handleBatchImport}
            onDriveBatchImport={handleDriveBatchImport}
              driveUploadProgress={driveUploadProgress}
            postsPerPage={postsPerPage}
            exporting={exporting}
            builderName={profileName}
            onDriveDrop={handleMultiDriveFileDrop}
            onFilesDrop={handleFiles}
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
            background: driveOpen ? "#D7FA06" : "#1a1a2e",
            color: driveOpen ? "#111" : driveToken ? "#D7FA06" : "rgba(255,255,255,0.4)",
            border: driveToken && !driveOpen ? "1.5px solid rgba(215,250,6,0.25)" : "none",
            borderRadius: 28,
            padding: "11px 20px",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.05em",
            cursor: "pointer",
            boxShadow: driveOpen ? "0 4px 20px rgba(215,250,6,0.25)" : "0 4px 24px rgba(0,0,0,0.35)",
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
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D7FA06", flexShrink: 0 }} />
          )}
        </button>
      )}

{driveToken && (
        <DrivePanel
        token={driveToken}
        isOpen={driveOpen}
        onClose={() => setDriveOpen(false)}
        onTokenExpired={() => { setDriveToken(null); setDriveOpen(false); alert("Drive session expired — click Drive to reconnect."); }}
        width={drivePanelWidth}
        onWidthChange={setDrivePanelWidth}
        linkPickMode={linkPickMode}
        onExitPickMode={() => setLinkPickMode({ active: false, onPick: null })}
      />
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Dancing+Script:wght@600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes driveShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes cardSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
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


async function makeThumbnailUrl(blob) {
  return new Promise(resolve => {
    const img = new Image();
    const tempUrl = URL.createObjectURL(blob);
    img.onload = () => {
      const MAX = 200;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(tempUrl);
      c.toBlob(b => resolve(b ? URL.createObjectURL(b) : null), "image/jpeg", 0.7);
    };
    img.onerror = () => { URL.revokeObjectURL(tempUrl); resolve(null); };
    img.src = tempUrl;
  });
}

const _thumbCache = new Map(); // persists for entire browser session

async function prefetchThumbnails(imageFiles, token) {
  const toFetch = imageFiles.filter(f => !_thumbCache.has(f.id));
  if (!toFetch.length) return;
  const BATCH = 4;
  for (let i = 0; i < toFetch.length; i += BATCH) {
    const batch = toFetch.slice(i, i + BATCH);
    await Promise.all(batch.map(async f => {
      try {
        const r = await fetch(`/api/drive-thumb?fileId=${f.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return;
        const contentType = r.headers.get("content-type") || "";
        let url;
        if (contentType.includes("application/json")) {
          const { cdnUrl } = await r.json();
          url = cdnUrl;
        } else {
          const blob = await r.blob();
          url = await makeThumbnailUrl(blob);
        }
        if (url) _thumbCache.set(f.id, url);
      } catch { /* silent — prefetch failures are non-critical */ }
    }));
  }
}

function DriveThumb({ fileId, thumbnailLink, token, name, imgStyle, mimeType }) {
  const [src, setSrc] = useState(() => _thumbCache.get(fileId) || (mimeType && mimeType.startsWith("video/") && thumbnailLink ? thumbnailLink : null));
  const [visible, setVisible] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.1, rootMargin: "150px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (_thumbCache.has(fileId)) { setSrc(_thumbCache.get(fileId)); return; }
    if (mimeType && mimeType.startsWith("video/")) {
      if (thumbnailLink) { _thumbCache.set(fileId, thumbnailLink); setSrc(thumbnailLink); }
      else setSrc("err");
      return;
    }
    let dead = false;
    (async () => {
      try {
        const r = await fetch(`/api/drive-thumb?fileId=${fileId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error("fetch failed");
        const contentType = r.headers.get("content-type") || "";
        let url;
        if (contentType.includes("application/json")) {
          // CDN URL — load directly, no blob conversion needed
          const { cdnUrl } = await r.json();
          url = cdnUrl;
        } else {
          // Blob fallback
          const blob = await r.blob();
          if (dead) return;
          url = await makeThumbnailUrl(blob);
        }
        if (dead || !url) return;
        _thumbCache.set(fileId, url);
        setSrc(url);
      } catch { if (!dead) setSrc("err"); }
    })();
    return () => { dead = true; };
  }, [visible, fileId, token, thumbnailLink]);

  return (
    <div ref={wrapRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      {!src && <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, #e8e8e8 25%, #f0f0f0 50%, #e8e8e8 75%)", backgroundSize: "200% 100%", animation: "driveShimmer 1.4s infinite" }} />}
      {src && src !== "err" && <img src={src} alt={name} style={imgStyle} />}
      {src === "err" && <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", fontSize: 20 }}>{mimeType && mimeType.startsWith("video/") ? "🎬" : "🖼"}</div>}
    </div>
  );
}

function DrivePanel({ token, isOpen, onClose, onTokenExpired, width, onWidthChange, linkPickMode = { active: false }, onExitPickMode }) {
  const [folderStack, setFolderStack] = useState([{ id: "root", name: "My Drive" }]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [lastClickedIdx, setLastClickedIdx] = useState(null);
  const panelRef = useRef(null);
  const currentFolder = folderStack[folderStack.length - 1];


  function startResize(e) {
    e.preventDefault();
    const startX = e.clientX, startW = width;
    function onMove(e) { onWidthChange(Math.min(600, Math.max(200, startW + (startX - e.clientX)))); }
    function onUp() { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  async function loadFolder(folderId) {
    setLoading(true); setError(""); setSelectedIds(new Set());
    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=%27${folderId}%27+in+parents+and+trashed%3Dfalse&fields=files(id%2Cname%2CmimeType%2CthumbnailLink%2CwebViewLink)&orderBy=folder%2CmodifiedTime+desc&pageSize=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.error) { if (data.error.code === 401) { onTokenExpired(); return; } throw new Error(data.error.message); }
      const allFiles = data.files || [];
      setFiles(allFiles);
      const imageFiles = allFiles.filter(f => f.mimeType.startsWith("image/"));
      prefetchThumbnails(imageFiles, token);
    } catch (e) {
      setError(e.message || "Failed to load — try refreshing Drive");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFolder(currentFolder.id); }, [currentFolder.id]);

  const folders = files.filter(f => f.mimeType === "application/vnd.google-apps.folder");
  const images = linkPickMode && linkPickMode.active
    ? files.filter(f => f.mimeType.startsWith("video/"))
    : files.filter(f => f.mimeType.startsWith("image/"));

  function handleImageClick(e, f, idx) {
    if (linkPickMode && linkPickMode.active && linkPickMode.onPick) {
      linkPickMode.onPick(f.webViewLink || "");
      onExitPickMode?.();
      onClose?.();
      return;
    }
    if (e.shiftKey && lastClickedIdx !== null) {
      const lo = Math.min(lastClickedIdx, idx), hi = Math.max(lastClickedIdx, idx);
      setSelectedIds(prev => { const next = new Set(prev); for (let i = lo; i <= hi; i++) next.add(images[i].id); return next; });
    } else {
      setSelectedIds(prev => { const next = new Set(prev); if (next.has(f.id)) next.delete(f.id); else next.add(f.id); return next; });
      setLastClickedIdx(idx);
    }
  }

  function buildDragData(f) {
    return (selectedIds.has(f.id) && selectedIds.size > 1)
      ? images.filter(img => selectedIds.has(img.id)).map(img => ({ id: img.id, link: img.webViewLink || "" }))
      : [{ id: f.id, link: f.webViewLink || "" }];
  }

  const cols = width >= 380 ? 3 : 2;

  return (
    <div ref={panelRef} data-drive-panel style={{ position: "fixed", right: 0, top: 0, height: "100vh", width, background: "white", boxShadow: "-4px 0 24px rgba(0,0,0,0.18)", zIndex: 500, display: isOpen ? "flex" : "none", flexDirection: "column", fontFamily: "'Helvetica Neue', Arial, sans-serif", userSelect: "none" }}>
      <div onMouseDown={startResize} style={{ position: "absolute", left: 0, top: 0, width: 6, height: "100%", cursor: "ew-resize", zIndex: 10 }} />
      <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 4, height: 48, background: "rgba(0,0,0,0.12)", borderRadius: "0 3px 3px 0", pointerEvents: "none" }} />

      <div style={{ background: "#1a1a2e", padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ color: "#D7FA06", fontWeight: 800, fontSize: 11, letterSpacing: "0.08em", marginBottom: 2 }}>GOOGLE DRIVE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 3, overflow: "hidden" }}>
            {folderStack.map((f, i) => (
              <span key={f.id} style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0 }}>
                {i > 0 && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, flexShrink: 0 }}>›</span>}
                <button onClick={() => i < folderStack.length - 1 && setFolderStack(prev => prev.slice(0, i + 1))} style={{ background: "none", border: "none", color: i === folderStack.length - 1 ? "white" : "rgba(255,255,255,0.45)", fontSize: 9, cursor: i < folderStack.length - 1 ? "pointer" : "default", padding: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 90, fontFamily: "inherit" }}>{f.name}</button>
              </span>
            ))}
          </div>
        </div>
        <button onClick={() => loadFolder(currentFolder.id)} title="Refresh" style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", borderRadius: 6, width: 28, height: 28, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>↻</button>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", borderRadius: 6, width: 28, height: 28, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
      </div>

      {folderStack.length > 1 && (
        <button onClick={() => { setFolderStack(prev => prev.slice(0, -1)); setSelectedIds(new Set()); }} style={{ background: "#f8f8f8", border: "none", borderBottom: "1px solid #eee", padding: "8px 14px", textAlign: "left", fontSize: 12, color: "#555", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, flexShrink: 0, fontFamily: "inherit" }}>← Back</button>
      )}

      {selectedIds.size > 0 ? (
        <div style={{ padding: "6px 14px", background: "#1a1a2e", borderBottom: "1px solid #0d0d1a", fontSize: 10, color: "white", fontWeight: 700, letterSpacing: "0.05em", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#D7FA06" }}>{selectedIds.size} selected — drag to a post card or the feed grid</span>
          <button onClick={() => setSelectedIds(new Set())} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: 4, padding: "2px 8px", fontSize: 10, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, marginLeft: 8 }}>Clear</button>
        </div>
      ) : (
        linkPickMode && linkPickMode.active ? (
          <div style={{ padding: "8px 14px", background: "#1a1a2e", borderBottom: "1px solid #0d0d1a", fontSize: 10, color: "#D7FA06", fontWeight: 700, letterSpacing: "0.05em", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>🎬 CLICK A FILE TO USE ITS LINK</span>
            <button onClick={onExitPickMode} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: 4, padding: "2px 8px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          </div>
        ) : (
          <div style={{ padding: "7px 14px", background: "#fffde7", borderBottom: "1px solid #f0e060", fontSize: 10, color: "#999", fontWeight: 700, letterSpacing: "0.05em", flexShrink: 0 }}>
            CLICK TO SELECT · SHIFT+CLICK FOR RANGE · DRAG TO CARD ↓
          </div>
        )
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
        {loading && <div style={{ textAlign: "center", padding: "40px 0", color: "#bbb", fontSize: 12 }}>Loading...</div>}
        {error && <div style={{ color: "#E8001C", fontSize: 11, padding: "10px 12px", background: "#fff0f0", borderRadius: 8, margin: 4 }}>{error}</div>}
        {!loading && !error && (
          <>
            {folders.map(f => (
              <div key={f.id} onClick={() => { setFolderStack(prev => [...prev, { id: f.id, name: f.name }]); setSelectedIds(new Set()); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, cursor: "pointer", marginBottom: 1 }} onMouseEnter={e => e.currentTarget.style.background = "#f5f5f5"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ fontSize: 15 }}>📁</span>
                <span style={{ fontSize: 12, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{f.name}</span>
                <span style={{ color: "#ccc", fontSize: 12, flexShrink: 0 }}>›</span>
              </div>
            ))}
            {folders.length > 0 && images.length > 0 && <div style={{ borderTop: "1px solid #f0f0f0", margin: "8px 0" }} />}
            {images.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6 }}>
                {images.map((f, idx) => {
                  const isSel = selectedIds.has(f.id);
                  return (
                    <div key={f.id} draggable
                      onClick={e => handleImageClick(e, f, idx)}
                      onDragStart={e => { const d = buildDragData(f); e.dataTransfer.setData("driveFileIds", JSON.stringify(d)); e.dataTransfer.setData("driveFileId", d[0].id); e.dataTransfer.setData("driveFileLink", d[0].link); e.dataTransfer.effectAllowed = "copy"; }}
                      title={f.name}
                      style={{ aspectRatio: "1", borderRadius: 6, overflow: "hidden", background: isSel ? "#1a1a2e" : "#f0f0f0", cursor: "grab", position: "relative", outline: isSel ? "2.5px solid #D7FA06" : "none", outlineOffset: -2 }}
                    >
                      <DriveThumb
                        fileId={f.id}
                        thumbnailLink={f.thumbnailLink}
                        token={token}
                        name={f.name}
                        mimeType={f.mimeType}
                        imgStyle={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none", opacity: isSel ? 0.7 : 1 }}
                      />
                      {isSel && <div style={{ position: "absolute", top: 4, right: 4, background: "#D7FA06", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "#111", pointerEvents: "none" }}>✓</div>}
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.65))", padding: "14px 5px 4px", fontSize: 8, color: "white", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", pointerEvents: "none" }}>{f.name}</div>
                    </div>
                  );
                })}
              </div>
            )}
            {files.length === 0 && <div style={{ textAlign: "center", padding: "40px 10px", color: "#bbb", fontSize: 12 }}><div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>No images or folders here</div>}
          </>
        )}
      </div>
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

function CalendarPage({ posts, allPosts, clientName, month, year, onUpdatePost, onSwapPosts, onBatchImport, onDriveBatchImport, postsPerPage, exporting, builderName, driveUploadProgress, onDriveDrop, onFilesDrop }) {
  const [notes, setNotes] = useState("");
  const feedPosts = allPosts.filter(p => p.contentType !== "Story");
  return (
    <div className="cal-page" style={{ background: "white", borderRadius: 0, boxShadow: "none", padding: `${postsPerPage > 2 ? 28 : 40}px ${postsPerPage > 2 ? 40 : 56}px`, marginBottom: 0, border: "1px solid #e8e8e8", aspectRatio: "1.41 / 1", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, borderBottom: "1px solid #eee", paddingBottom: 8, flexShrink: 0 }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 400, fontSize: postsPerPage > 3 ? 22 : postsPerPage > 2 ? 26 : 32, color: "#111", lineHeight: 1 }}>
          {MONTHS[month]} {year} &nbsp;<em>| Content Calendar</em>
        </h1>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 400, fontSize: postsPerPage > 3 ? 20 : postsPerPage > 2 ? 24 : 30, color: "#222" }}>{clientName}</h2>
      </div>
      <div style={{ display: "flex", gap: 20, alignItems: "stretch", flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, display: "flex", gap: 18, alignItems: "stretch", minHeight: 0 }}>
          {posts.map((post, i) => (
            <div key={i} style={{ flex: "0 0 auto", width: `calc((100% - ${(postsPerPage - 1) * 18}px) / ${postsPerPage})`, display: "flex" }}>
            <PostCard post={post} month={month} year={year} onUpdate={(field, val) => onUpdatePost(post.day, post.postIdx ?? i, field, val)} isExporting={exporting} onDriveDrop={onDriveDrop ? (fileInfos) => onDriveDrop(post.day, post.postIdx ?? i, fileInfos) : undefined} onFilesDrop={onFilesDrop ? (files) => onFilesDrop(post.day, post.postIdx ?? i, files) : undefined} />
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
          <div style={{ border: "1.5px solid #e8e8e8", borderRadius: 10, padding: "10px 12px", flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#333", marginBottom: 6 }}>Notes:</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Add notes..." style={{ width: "100%", border: "none", outline: "none", resize: "none", fontSize: 12, color: "#444", fontFamily: "inherit", lineHeight: 1.5, background: "white", borderRadius: 4, padding: "2px 0" }} />
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <ReorderFeedGrid allPosts={feedPosts} onSwap={onSwapPosts} onBatchImport={onBatchImport} onDriveBatchImport={onDriveBatchImport} driveUploadProgress={driveUploadProgress} />
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

// ── Reorderable Feed Grid ──
function ReorderFeedGrid({ allPosts, onSwap, onBatchImport, onDriveBatchImport, driveUploadProgress }) {
  const [dragSrc, setDragSrc] = useState(null); // { day, postIdx }
  const [hoverTarget, setHoverTarget] = useState(null);
  const [dropHighlight, setDropHighlight] = useState(false);

  const postsWithImages = allPosts.filter(p => p?.imageUrls?.[0] || p?.placeholder);
  // Instagram order: newest top-left, oldest bottom-right
  // Reverse so newest is first, pad front with nulls to push newest to right of top row
  const reversed = [...postsWithImages].reverse();
  const padCount = reversed.length % 3 === 0 ? 0 : 3 - (reversed.length % 3);
  const cells = [...Array(padCount).fill(null), ...reversed];

  return (
    <div
    style={{ border: `1.5px solid ${dropHighlight ? "#1a1a2e" : "#e8e8e8"}`, borderRadius: 10, padding: "12px 14px", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box", background: dropHighlight ? "#f4f4ff" : "white", transition: "border-color 0.15s, background 0.15s", position: "relative" }}
      onDragOver={e => { const types = [...e.dataTransfer.types].map(t => t.toLowerCase()); if (types.includes("files") || types.includes("drivefileids")) { e.preventDefault(); setDropHighlight(true); } }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDropHighlight(false); }}
      onDrop={e => { e.preventDefault(); setDropHighlight(false); const raw = e.dataTransfer.getData("driveFileIds"); if (raw && onDriveBatchImport) { onDriveBatchImport(JSON.parse(raw)); } else if (e.dataTransfer.files.length && onBatchImport) { onBatchImport(e.dataTransfer.files); } }}
    >
      {driveUploadProgress && driveUploadProgress.active && driveUploadProgress.day === null && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.88)", borderRadius: 10, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, border: "3.5px solid #e8e8e8", borderTop: "3.5px solid #1a1a2e", borderRadius: "50%", animation: "cardSpin 0.75s linear infinite" }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.06em" }}>
            {driveUploadProgress.total > 1 ? `${driveUploadProgress.done} / ${driveUploadProgress.total} UPLOADING` : "UPLOADING..."}
          </span>
        </div>
      )}
      <div className="feed-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <div className="feed-label" style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>Feed:</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="no-print" style={{ fontSize: 9, color: "#bbb", letterSpacing: "0.04em" }}>drag to reorder</div>
          {onBatchImport && (
            <label className="no-print" title="Batch import images — fills posts in order" style={{ background: "#1a1a2e", color: "#D7FA06", border: "none", borderRadius: 5, fontSize: 8, fontWeight: 700, padding: "3px 7px", cursor: "pointer", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
              + Batch Import
              <input type="file" accept="image/*" multiple onChange={e => { onBatchImport(e.target.files); e.target.value = ""; }} style={{ display: "none" }} />
            </label>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, flex: 1, minHeight: 0, overflow: "hidden", alignContent: "start" }}>
        {cells.map((post, i) => {
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
                  <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${post.imageUrls[0]})`, backgroundSize: (post.scale ?? 1) <= 1.05 ? "cover" : `${(post.scale ?? 1) * 100}%`, backgroundPosition: `${post.cropX ?? 50}% ${post.cropY ?? 50}%`, backgroundRepeat: "no-repeat", pointerEvents: "none" }} />
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
function SaveMenu({ onSave, onExport, showExport }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: "#D7FA06", color: "#111", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
        💾 Save
        <span style={{ fontSize: 9, display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>▾</span>
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "white", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", minWidth: 170, overflow: "hidden", zIndex: 200 }}>
            <NavMenuItem onClick={() => { setOpen(false); onSave(); }}>💾 Save Draft</NavMenuItem>
            {showExport && <NavMenuItem onClick={() => { setOpen(false); onExport(); }}>↓ Export PDF</NavMenuItem>}
          </div>
        </>
      )}
    </div>
  );
}

function NavMenuItem({ onClick, color = "#333", children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: "100%", padding: "10px 16px", background: hovered ? "#f7f7f7" : "none", border: "none", textAlign: "left", fontSize: 13, color, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "background 0.12s", boxShadow: hovered ? "inset 0 0 0 1px rgba(0,0,0,0.04)" : "none" }}
    >{children}</button>
  );
}

function NavProfileMenu({ profileName, currentCalendarId, onMyCalendars, onHistory, onEditProfile, onSignOut }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: open ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.1)", border: "none", borderRadius: 7, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "background 0.15s" }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#D7FA06", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#111", flexShrink: 0 }}>
          {profileName ? profileName[0].toUpperCase() : "?"}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#ccc", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profileName}</span>
        <span style={{ fontSize: 9, color: "#555", transition: "transform 0.15s", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "white", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", minWidth: 190, overflow: "hidden", zIndex: 200 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{profileName}</div>
            </div>
            {currentCalendarId && <NavMenuItem onClick={() => { setOpen(false); onMyCalendars(); }}>🗂 My Calendars</NavMenuItem>}
            {currentCalendarId && <NavMenuItem onClick={() => { setOpen(false); onHistory(); }}>🕓 Version History</NavMenuItem>}
            <NavMenuItem onClick={() => { setOpen(false); onEditProfile(); }}>✏️ Edit Profile</NavMenuItem>
            <div style={{ borderTop: "1px solid #f0f0f0" }}>
              <NavMenuItem onClick={() => { setOpen(false); onSignOut(); }} color="#E8001C">Sign out</NavMenuItem>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
function PostCard({ post, month, year, onUpdate, isExporting, onDriveDrop, onFilesDrop }) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [reframing, setReframing] = useState(false);
  const [dropHighlight, setDropHighlight] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showPostingNotes, setShowPostingNotes] = useState(false);
  const [carouselView, setCarouselView] = useState("gallery"); // "gallery" | "stacked"
  const effectiveView = isExporting ? "stacked" : carouselView;
  const isReel = post.contentType === "Reel";
  const isCarousel = post.contentType === "Carousel";
  const totalSlides = post.imageUrls?.length || 0;
  const currentSlide = Math.min(slideIdx, Math.max(0, totalSlides - 1));
  const mainImage = isCarousel ? post.imageUrls?.[currentSlide] : post.imageUrls?.[0];
  const dayName = getDayName(year, month, post.day);
  const dateStr = formatDate(month, post.day);

  async function handleReplaceFiles(files) {
    const imageFiles = [...files].filter(f => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    if (imageFiles.length > 1 && onFilesDrop) {
      onFilesDrop(imageFiles);
      return;
    }
    try {
      const blob = await compressToBlob(imageFiles[0]);
      const url = await uploadToCloudinary(blob);
      if (isCarousel) {
        const newUrls = [...(post.imageUrls || [])];
        newUrls[currentSlide] = url;
        onUpdate("imageUrls", newUrls);
      } else {
        onUpdate("imageUrls", [url]);
      }
    } catch(e) { alert("Upload failed: " + e.message); }
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
        onDrop={e => {
          e.preventDefault();
          setDropHighlight(false);
          const raw = e.dataTransfer.getData("driveFileIds");
          if (raw && onDriveDrop) { onDriveDrop(JSON.parse(raw)); return; }
          const did = e.dataTransfer.getData("driveFileId");
          const dlink = e.dataTransfer.getData("driveFileLink");
          if (did && onDriveDrop) { onDriveDrop([{ id: did, link: dlink || "" }]); return; }
          handleReplaceFiles(e.dataTransfer.files);
        }}
      >
        <div style={{ outline: reframing ? "2px solid #D7FA06" : "none", borderRadius: 8, transition: "outline 0.15s", visibility: (isCarousel && effectiveView === "stacked") ? "hidden" : "visible" }}>
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
        {hovering && (
          <div style={{ position: "absolute", top: 6, left: 6, zIndex: 20, display: "flex", alignItems: "center", gap: 5 }} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
            <button onClick={() => setShowTypeMenu(s => !s)} style={{ background: "rgba(0,0,0,0.55)", color: "white", border: "none", borderRadius: 20, padding: "3px 9px", fontSize: 9, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, letterSpacing: "0.04em" }}>
              {post.contentType} <span style={{ fontSize: 8 }}>▾</span>
            </button>
            
            {showTypeMenu && (
              <div style={{ position: "absolute", top: "110%", left: 0, background: "white", border: "1.5px solid #e0e0e0", borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.15)", overflow: "hidden", minWidth: 110 }}>
                {CONTENT_TYPES.map(t => (
                  <div key={t} onClick={() => { onUpdate("contentType", t); setShowTypeMenu(false); }} style={{ padding: "7px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", background: t === post.contentType ? "#f0f4ff" : "white", color: t === post.contentType ? "#1a1a2e" : "#444" }}>{t}</div>
                ))}
              </div>
            )}
          </div>
        )}
        {mainImage && hovering && (
          <button
            onClick={e => { e.stopPropagation(); handleDelete(); }}
            title="Delete photo"
            style={{ position: "absolute", top: 6, right: 6, background: "transparent", color: "white", border: "none", borderRadius: "50%", width: 22, height: 22, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, lineHeight: 1, textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
          >✕</button>
        )}
        {isCarousel && hovering && (
          <label title="Add photo to carousel" onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.55)", color: "white", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 300, lineHeight: 1, marginTop: -1, pointerEvents: "none" }}>+</span>
            <input type="file" accept="image/*" multiple onChange={e => {
              const files = [...e.target.files].filter(f => f.type.startsWith("image/"));
              Promise.all(files.map(f => new Promise(res => { const r = new FileReader(); r.onload = ev => res(ev.target.result); r.readAsDataURL(f); }))).then(urls => {
                onUpdate("imageUrls", [...(post.imageUrls || []), ...urls]);
              });
              e.target.value = "";
            }} style={{ display: "none" }} />
          </label>
        )}
        {isCarousel && totalSlides > 1 && effectiveView === "gallery" && (
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
        {isCarousel && totalSlides > 1 && effectiveView === "stacked" && (
          <div style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none", zIndex: 5 }}>
          {[...post.imageUrls].reverse().map((url, i) => {
            const total = post.imageUrls.length;
            const stackIdx = total - 1 - i; // 0 = top-left/front, total-1 = bottom-right/back
            // cardW sized so 40% is hidden (60% visible) and stack spans corner to corner
              // Derived: (1 - spread/cardW)² = 0.40 → spread = 0.3675*cardW
              // Corner-to-corner: (N-1)*spread = 100-cardW → cardW = 100/(0.3675*(N-1)+1)
              const cardW = total > 1 ? 100 / (0.3675 * (total - 1) + 1) : 70;
              const spread = total > 1 ? (100 - cardW) / (total - 1) : 0;
              const leftPct = stackIdx * spread;
              const topPct = stackIdx * spread;
              return (
                <div key={i} style={{
                  position: "absolute",
                  top: `${topPct}%`,
                  left: `${leftPct}%`,
                  width: `${cardW}%`,
                  aspectRatio: "4/5",
                  backgroundImage: `url(${url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  borderRadius: 4,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  zIndex: total - stackIdx,
                  pointerEvents: "none",
                }} />
            );
          })}
        </div>
        )}
      </div>
      {isCarousel && totalSlides > 1 && (
        <div className="no-print" style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          <button onClick={() => setCarouselView("gallery")} style={{ flex: 1, padding: "4px 0", fontSize: 10, fontWeight: 700, border: "1.5px solid #e0e0e0", borderRadius: "6px 0 0 6px", background: carouselView === "gallery" ? "#1a1a2e" : "white", color: carouselView === "gallery" ? "#D7FA06" : "#aaa", cursor: "pointer" }}>▶ Gallery</button>
          <button onClick={() => setCarouselView("stacked")} style={{ flex: 1, padding: "4px 0", fontSize: 10, fontWeight: 700, border: "1.5px solid #e0e0e0", borderLeft: "none", borderRadius: "0 6px 6px 0", background: carouselView === "stacked" ? "#1a1a2e" : "white", color: carouselView === "stacked" ? "#D7FA06" : "#aaa", cursor: "pointer" }}>⧉ PDF View</button>
        </div>
      )}
      <a href={linkHref || "#"} target="_blank" rel="noreferrer" style={{ background: "#1a1a2e", color: "white", borderRadius: 24, padding: "6px 0", textAlign: "center", fontSize: 11, fontWeight: 700, textDecoration: "underline", display: "block", cursor: "pointer" }}>
        {isReel ? "Reel Link" : isCarousel ? `Slide ${currentSlide + 1} Link` : "Photo Link"}
      </a>
      <div style={{ border: "1.5px solid #e8e8e8", borderRadius: 8, padding: "14px 16px", flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#333", marginBottom: 10 }}>Caption:</div>
        <textarea value={post.caption || ""} onChange={e => onUpdate("caption", e.target.value)} placeholder="Caption..." rows={4} style={{ fontSize: 13, color: "#444", lineHeight: 1.7, width: "100%", border: "none", outline: "none", resize: "none", fontFamily: "inherit", background: "transparent", padding: 0, flex: 1 }} />
        <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 10, paddingTop: 8 }}>
          {showPostingNotes || post.postingNotes ? (
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>Posting Notes</div>
              <textarea value={post.postingNotes || ""} onChange={e => onUpdate("postingNotes", e.target.value)} placeholder="e.g. Post Tuesday 6pm · tag @partner · add location..." rows={2} style={{ width: "100%", fontSize: 11, color: "#666", lineHeight: 1.5, border: "none", outline: "none", resize: "none", fontFamily: "inherit", background: "transparent", padding: 0 }} />
              {!post.postingNotes && <button onClick={() => setShowPostingNotes(false)} style={{ position: "absolute", top: 0, right: 0, background: "none", border: "none", fontSize: 11, color: "#ccc", cursor: "pointer" }}>✕</button>}
            </div>
          ) : (
            <button onClick={() => setShowPostingNotes(true)} className="no-export" style={{ background: "none", border: "none", fontSize: 10, color: "#ccc", cursor: "pointer", padding: 0, fontFamily: "inherit", letterSpacing: "0.04em" }}>+ posting notes</button>
          )}
        </div>
      </div>
    </div>
  );
}