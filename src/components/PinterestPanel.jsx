import { useState, useRef, useCallback } from "react";

const CLIENT_ID = import.meta.env.VITE_PINTEREST_CLIENT_ID;

// ── PKCE helpers ──────────────────────────────────────────────────────────────
function generateVerifier() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function generateChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export default function PinterestPanel({ isOpen, onClose, onAddImages, width, onWidthChange, pinterestToken, onTokenReceived, showToast }) {
  const [mode, setMode] = useState("choose"); // 'choose' | 'url' | 'oauth'
  const [urlInput, setUrlInput] = useState("");
  const [boards, setBoards] = useState([]);
  const [pins, setPins] = useState([]);
  const [boardStack, setBoardStack] = useState([]); // [{ id, name }]
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [lastClickedIdx, setLastClickedIdx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emptyMsg, setEmptyMsg] = useState("");
  const popupRef = useRef(null);

  function startResize(e) {
    e.preventDefault();
    const startX = e.clientX, startW = width;
    function onMove(e) { onWidthChange(Math.min(600, Math.max(200, startW + (startX - e.clientX)))); }
    function onUp() { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // ── URL mode ─────────────────────────────────────────────────────────────────
  async function fetchByUrl() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setLoading(true); setError(""); setEmptyMsg(""); setPins([]);
    try {
      const res = await fetch(`/api/pinterest-board-url?url=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Something went wrong loading the board. Please try again.");
        return;
      }
      if (data.empty) { setEmptyMsg(data.message || "This board appears to be empty."); return; }
      setPins(data.pins || []);
    } catch {
      setError("Something went wrong loading the board. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── OAuth mode ────────────────────────────────────────────────────────────────
  async function connectPinterest() {
    if (!CLIENT_ID) {
      showToast("Pinterest app not configured — add VITE_PINTEREST_CLIENT_ID", "error");
      return;
    }
    const verifier = generateVerifier();
    const challenge = await generateChallenge(verifier);
    sessionStorage.setItem("pinterest_pkce_verifier", verifier);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: `${window.location.origin}/pinterest-callback.html`,
      response_type: "code",
      scope: "boards:read,pins:read",
      code_challenge: challenge,
      code_challenge_method: "S256",
    });

    const popup = window.open(`https://www.pinterest.com/oauth/?${params}`, "pinterest_auth", "width=620,height=700,left=200,top=100");
    if (!popup) {
      showToast("Please allow popups for this site to connect Pinterest.", "error");
      return;
    }
    popupRef.current = popup;

    function onMessage(e) {
      if (e.origin !== window.location.origin || e.data?.type !== "PINTEREST_AUTH") return;
      window.removeEventListener("message", onMessage);
      const { code, error: authError } = e.data;
      if (authError || !code) {
        showToast("Pinterest login failed. Please try again.", "error");
        return;
      }
      exchangeCode(code, verifier);
    }
    window.addEventListener("message", onMessage);
  }

  async function exchangeCode(code, verifier) {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/pinterest-boards?action=exchange&code=${encodeURIComponent(code)}&verifier=${encodeURIComponent(verifier)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Pinterest login failed. Please try again.");
      onTokenReceived(data.access_token);
      loadBoards(data.access_token);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadBoards(tok) {
    const useToken = tok || pinterestToken;
    setLoading(true); setError(""); setBoards([]); setPins([]); setBoardStack([]);
    try {
      const res = await fetch(`/api/pinterest-boards?action=boards&token=${encodeURIComponent(useToken)}`);
      const data = await res.json();
      if (res.status === 401) { onTokenReceived(null); showToast("Pinterest session expired — please reconnect.", "error"); return; }
      if (!res.ok) throw new Error(data.error || "Something went wrong loading the board. Please try again.");
      setBoards(data.boards || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function openBoard(board) {
    setBoardStack([board]); setSelectedIds(new Set()); setLastClickedIdx(null);
    setLoading(true); setError(""); setEmptyMsg(""); setPins([]);
    try {
      const res = await fetch(`/api/pinterest-boards?action=pins&boardId=${encodeURIComponent(board.id)}&token=${encodeURIComponent(pinterestToken)}`);
      const data = await res.json();
      if (res.status === 401) { onTokenReceived(null); showToast("Pinterest session expired — please reconnect.", "error"); return; }
      if (!res.ok) throw new Error(data.error || "Something went wrong loading the board. Please try again.");
      if (!data.pins?.length) { setEmptyMsg("This board appears to be empty."); return; }
      setPins(data.pins);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Pin selection ─────────────────────────────────────────────────────────────
  function handlePinClick(e, pin, idx) {
    if (e.shiftKey && lastClickedIdx !== null) {
      const lo = Math.min(lastClickedIdx, idx), hi = Math.max(lastClickedIdx, idx);
      setSelectedIds(prev => { const next = new Set(prev); for (let i = lo; i <= hi; i++) next.add(pins[i].id); return next; });
    } else {
      setSelectedIds(prev => { const next = new Set(prev); if (next.has(pin.id)) next.delete(pin.id); else next.add(pin.id); return next; });
      setLastClickedIdx(idx);
    }
  }

  function addSelected() {
    const urls = pins.filter(p => selectedIds.has(p.id)).map(p => p.image_url);
    if (urls.length) { onAddImages(urls); setSelectedIds(new Set()); showToast(`${urls.length} image${urls.length > 1 ? "s" : ""} added to plan`, "success"); }
  }

  function resetToChoose() {
    setMode("choose"); setPins([]); setBoards([]); setBoardStack([]); setSelectedIds(new Set()); setError(""); setEmptyMsg(""); setUrlInput("");
  }

  const showingPins = pins.length > 0;
  const cols = width >= 380 ? 3 : 2;

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", right: 0, top: 0, height: "100vh", width, background: "white", boxShadow: "-4px 0 24px rgba(0,0,0,0.18)", zIndex: 500, display: "flex", flexDirection: "column", fontFamily: "'Helvetica Neue', Arial, sans-serif", userSelect: "none" }}>
      {/* Resize handle */}
      <div onMouseDown={startResize} style={{ position: "absolute", left: 0, top: 0, width: 6, height: "100%", cursor: "ew-resize", zIndex: 10 }} />
      <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 4, height: 48, background: "rgba(0,0,0,0.12)", borderRadius: "0 3px 3px 0", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ background: "#E60023", padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ color: "white", fontWeight: 800, fontSize: 11, letterSpacing: "0.08em", marginBottom: 2 }}>PINTEREST</div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 9, fontWeight: 600, letterSpacing: "0.04em" }}>
            {mode === "choose" ? "SHOT PLAN REFERENCES" : mode === "url" ? "PASTE BOARD URL" : boardStack.length ? boardStack[0].name.toUpperCase() : "YOUR BOARDS"}
          </div>
        </div>
        {mode !== "choose" && (
          <button onClick={resetToChoose} title="Back" style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: 6, width: 28, height: 28, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>←</button>
        )}
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: 6, width: 28, height: 28, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
      </div>

      {/* Back button when browsing pins */}
      {mode === "oauth" && boardStack.length > 0 && (
        <button onClick={() => { setBoardStack([]); setPins([]); setSelectedIds(new Set()); setEmptyMsg(""); setError(""); }} style={{ background: "#f8f8f8", border: "none", borderBottom: "1px solid #eee", padding: "8px 14px", textAlign: "left", fontSize: 12, color: "#555", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, flexShrink: 0, fontFamily: "inherit" }}>← All Boards</button>
      )}

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div style={{ padding: "6px 14px", background: "#E60023", borderBottom: "1px solid #cc0020", fontSize: 10, color: "white", fontWeight: 700, letterSpacing: "0.05em", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{selectedIds.size} selected</span>
          <button onClick={() => setSelectedIds(new Set())} style={{ background: "rgba(255,255,255,0.25)", border: "none", color: "white", borderRadius: 4, padding: "2px 8px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>Clear</button>
        </div>
      )}
      {selectedIds.size === 0 && showingPins && (
        <div style={{ padding: "7px 14px", background: "#fff5f5", borderBottom: "1px solid #ffd6d6", fontSize: 10, color: "#cc4444", fontWeight: 700, letterSpacing: "0.05em", flexShrink: 0 }}>
          CLICK TO SELECT · SHIFT+CLICK FOR RANGE
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: mode === "choose" ? 20 : 10 }}>
        {loading && <div style={{ textAlign: "center", padding: "40px 0", color: "#bbb", fontSize: 12 }}>Loading...</div>}
        {error && <div style={{ color: "#E8001C", fontSize: 11, padding: "10px 12px", background: "#fff0f0", borderRadius: 8, margin: 4 }}>{error}</div>}
        {emptyMsg && !loading && <div style={{ textAlign: "center", padding: "30px 10px", color: "#aaa", fontSize: 12 }}><div style={{ fontSize: 24, marginBottom: 8 }}>📌</div>{emptyMsg}</div>}

        {/* Choose mode */}
        {mode === "choose" && !loading && (
          <div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 20, lineHeight: 1.5 }}>Add Pinterest reference images to your shot plan. Choose how to connect:</div>
            <button
              onClick={() => { setMode("url"); setError(""); }}
              style={{ width: "100%", padding: "14px 16px", background: "white", border: "2px solid #E60023", borderRadius: 10, cursor: "pointer", marginBottom: 12, textAlign: "left", fontFamily: "inherit" }}
            >
              <div style={{ fontWeight: 800, fontSize: 13, color: "#E60023", marginBottom: 4 }}>📋 Paste Board URL</div>
              <div style={{ fontSize: 11, color: "#888", lineHeight: 1.4 }}>Paste any public Pinterest board URL — no login needed.</div>
            </button>
            <button
              onClick={() => {
                if (pinterestToken) { setMode("oauth"); loadBoards(); }
                else { setMode("oauth"); connectPinterest(); }
              }}
              style={{ width: "100%", padding: "14px 16px", background: CLIENT_ID ? "white" : "#f8f8f8", border: `2px solid ${CLIENT_ID ? "#1a1a2e" : "#e0e0e0"}`, borderRadius: 10, cursor: CLIENT_ID ? "pointer" : "default", textAlign: "left", fontFamily: "inherit", opacity: CLIENT_ID ? 1 : 0.5 }}
            >
              <div style={{ fontWeight: 800, fontSize: 13, color: CLIENT_ID ? "#1a1a2e" : "#aaa", marginBottom: 4 }}>🔐 Connect Pinterest Account</div>
              <div style={{ fontSize: 11, color: "#888", lineHeight: 1.4 }}>{CLIENT_ID ? "Browse your own boards and pins with OAuth." : "Requires VITE_PINTEREST_CLIENT_ID env var."}</div>
            </button>
          </div>
        )}

        {/* URL mode */}
        {mode === "url" && !loading && !showingPins && !emptyMsg && (
          <div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 12, lineHeight: 1.5 }}>Paste a public Pinterest board URL (e.g. <span style={{ color: "#E60023", fontWeight: 600 }}>pinterest.com/username/boardname</span>)</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                autoFocus
                type="text"
                value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && fetchByUrl()}
                placeholder="pinterest.com/username/boardname"
                style={{ flex: 1, padding: "9px 12px", border: `1.5px solid ${error ? "#E60023" : "#e0e0e0"}`, borderRadius: 8, fontSize: 12, outline: "none", fontFamily: "inherit" }}
              />
              <button
                onClick={fetchByUrl}
                disabled={!urlInput.trim()}
                style={{ background: "#E60023", color: "white", border: "none", borderRadius: 8, padding: "9px 14px", fontWeight: 800, fontSize: 12, cursor: urlInput.trim() ? "pointer" : "default", fontFamily: "inherit", opacity: urlInput.trim() ? 1 : 0.5, flexShrink: 0 }}
              >
                Fetch
              </button>
            </div>
          </div>
        )}

        {/* OAuth boards list */}
        {mode === "oauth" && !loading && !boardStack.length && boards.length > 0 && (
          <div>
            {boards.map(b => (
              <div key={b.id} onClick={() => openBoard(b)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px", borderRadius: 8, cursor: "pointer", marginBottom: 2 }} onMouseEnter={e => e.currentTarget.style.background = "#f5f5f5"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                {b.cover_url ? (
                  <img src={b.cover_url} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 44, height: 44, background: "#f0f0f0", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📌</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
                  {b.pin_count > 0 && <div style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>{b.pin_count} pins</div>}
                </div>
                <span style={{ color: "#ccc", fontSize: 14, flexShrink: 0 }}>›</span>
              </div>
            ))}
          </div>
        )}

        {/* Pin grid (shared between url + oauth modes) */}
        {showingPins && !loading && (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6 }}>
            {pins.map((pin, idx) => {
              const isSel = selectedIds.has(pin.id);
              return (
                <div
                  key={pin.id}
                  onClick={e => handlePinClick(e, pin, idx)}
                  title={pin.title || undefined}
                  style={{ borderRadius: 6, overflow: "hidden", background: isSel ? "#cc0020" : "#f0f0f0", cursor: "pointer", position: "relative", outline: isSel ? "2.5px solid #E60023" : "none", outlineOffset: -2 }}
                >
                  <img
                    src={pin.image_url}
                    alt={pin.title || ""}
                    loading="lazy"
                    style={{ width: "100%", height: "auto", display: "block", opacity: isSel ? 0.65 : 1 }}
                    onError={e => { e.currentTarget.style.display = "none"; }}
                  />
                  {isSel && (
                    <div style={{ position: "absolute", top: 4, right: 4, background: "#E60023", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "white", pointerEvents: "none" }}>✓</div>
                  )}
                  {pin.title && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.65))", padding: "14px 5px 4px", fontSize: 8, color: "white", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", pointerEvents: "none" }}>{pin.title}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer: Add to Plan button */}
      {selectedIds.size > 0 && (
        <div style={{ padding: "12px 14px", borderTop: "1px solid #f0f0f0", flexShrink: 0 }}>
          <button
            onClick={addSelected}
            style={{ width: "100%", background: "#E60023", color: "white", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
          >
            Add {selectedIds.size} to Shot Plan
          </button>
        </div>
      )}
    </div>
  );
}
