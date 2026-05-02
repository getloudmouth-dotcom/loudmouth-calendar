import { useState, useRef, useEffect } from "react";
import { getSlideCropX, getSlideCropY, getSlideScale, getDayName, formatDate, compressToBlob, uploadToCloudinary } from "../utils";
import { CONTENT_TYPES } from "../constants";
import DraggableImage from "./DraggableImage";
import { useApp } from "../AppContext";
import { C } from "../theme";

const CAPTION_EMOJIS = ["❤️","🔥","✨","🙌","👏","💯","🎉","😍","😂","🤣","😊","🥰","🙏","👀","💪","🌟","⭐","🚀","💫","🌈","🎯","💡","📸","🎶","🌺","🌸","💎","👑","🦋","🌙","☀️","🌊","🍀","🌿","💚","💙","💜","🖤","🤍","❤️‍🔥"];

export default function PostCard({ post, month, year, onUpdate, isExporting, onDriveDrop, onFilesDrop, driveUploadProgress, onPickReelLink }) {
  const { showToast } = useApp();
  const [slideIdx, setSlideIdx] = useState(0);
  const [reframing, setReframing] = useState(false);
  const [dropHighlight, setDropHighlight] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showPostingNotes, setShowPostingNotes] = useState(!!post.postingNotes);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const captionRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const postingNotesRef = useRef(null);

  useEffect(() => {
    const el = captionRef.current;
    if (!el) return;
    let size = 13;
    el.style.fontSize = size + "px";
    while (el.scrollHeight > el.clientHeight && size > 7.5) {
      size -= 0.5;
      el.style.fontSize = size + "px";
    }
  }, [post.caption]);

  useEffect(() => {
    const el = postingNotesRef.current;
    if (!el) return;
    let size = 10;
    el.style.fontSize = size + "px";
    while ((el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) && size > 6) {
      size -= 0.5;
      el.style.fontSize = size + "px";
    }
  }, [post.postingNotes, showPostingNotes]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    function handleClick(e) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmojiPicker]);

  function insertEmoji(emoji) {
    const el = captionRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = post.caption || "";
    onUpdate("caption", current.slice(0, start) + emoji + current.slice(end));
    setTimeout(() => {
      el.selectionStart = start + emoji.length;
      el.selectionEnd = start + emoji.length;
      el.focus();
    }, 0);
  }

  const isReel = post.contentType === "Reel";
  const isCarousel = post.contentType === "Carousel";
  const totalSlides = post.imageUrls?.length || 0;
  const currentSlide = Math.min(slideIdx, Math.max(0, totalSlides - 1));
  const mainImage = isCarousel ? post.imageUrls?.[currentSlide] : post.imageUrls?.[0];
  const photoCrop = (isCarousel && mainImage) ? (post.crops?.[mainImage] ?? {}) : {};
  const effectiveCropX = photoCrop.cropX ?? post.cropX ?? 50;
  const effectiveCropY = photoCrop.cropY ?? post.cropY ?? 50;
  const effectiveScale = photoCrop.scale ?? post.scale ?? 1;
  function handleCropUpdate(field, value) {
    if (isCarousel && mainImage && (field === "cropX" || field === "cropY" || field === "scale")) {
      const newCrops = { ...(post.crops || {}) };
      newCrops[mainImage] = { ...(newCrops[mainImage] || { cropX: 50, cropY: 50, scale: 1 }), [field]: value };
      onUpdate("crops", newCrops);
    } else {
      onUpdate(field, value);
    }
  }
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
    } catch(e) { showToast("Upload failed: " + e.message, "error"); }
    setReframing(false);
  }

  function handleDelete() {
    if (isCarousel) {
      const newUrls = post.imageUrls.filter((_, i) => i !== currentSlide);
      onUpdate("imageUrls", newUrls);
      if (newUrls.length <= 1) onUpdate("contentType", "Photo");
      setSlideIdx(Math.max(0, currentSlide - 1));
    } else {
      onUpdate("imageUrls", []);
      onUpdate("url", "");
    }
  }

  const linkHref = isCarousel ? (post.urls?.[currentSlide] || post.url) : isReel ? (post.videoUrl || post.urls?.[0] || post.url) : post.url;

  function getSlideSettings(idx) {
    const s = post.slideSettings?.[idx];
    return {
      cropX: s?.cropX ?? post.cropX ?? 50,
      cropY: s?.cropY ?? post.cropY ?? 50,
      scale: s?.scale ?? post.scale ?? 1,
    };
  }
  function updateSlideSettings(idx, key, value) {
    const settings = [...(post.slideSettings || [])];
    settings[idx] = { ...getSlideSettings(idx), [key]: value };
    onUpdate("slideSettings", settings);
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
      <div style={{ background: C.canvas, color: "white", borderRadius: 24, padding: "5px 0", textAlign: "center", fontSize: 12, fontWeight: 700 }}>
        {dayName} {dateStr}
      </div>
      <div
        style={{ position: "relative" }}
        onDoubleClick={() => !isCarousel && mainImage && setReframing(r => !r)}
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
        <div style={{ outline: reframing ? `2px solid ${C.accent}` : "none", borderRadius: 8, transition: "outline 0.15s", visibility: isCarousel ? "hidden" : "visible" }}>
          <DraggableImage src={mainImage} cropX={effectiveCropX} cropY={effectiveCropY} scale={effectiveScale} onUpdate={handleCropUpdate} isCarousel={isCarousel} isVideo={isReel} placeholder={post.placeholder} />
        </div>
        {dropHighlight && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(19,19,19,0.5)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 15 }}>
            <span style={{ color: C.accent, fontWeight: 700, fontSize: 12 }}>Drop to replace</span>
          </div>
        )}
        {driveUploadProgress && driveUploadProgress.active && driveUploadProgress.day === post.day && driveUploadProgress.postIdx === (post.postIdx ?? 0) && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.88)", borderRadius: 8, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, pointerEvents: "none" }}>
            <div style={{ width: 36, height: 36, border: "3.5px solid #e8e8e8", borderTop: `3.5px solid ${C.canvas}`, borderRadius: "50%", animation: "cardSpin 0.75s linear infinite" }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: C.meta, letterSpacing: "0.06em" }}>
              {driveUploadProgress.total > 1 ? `${driveUploadProgress.done} / ${driveUploadProgress.total}` : "UPLOADING..."}
            </span>
          </div>
        )}
        {reframing && (
          <div
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, overflow: "hidden", background: "rgba(0,0,0,0.78)", borderBottomLeftRadius: 8, borderBottomRightRadius: 8, padding: "8px 12px", zIndex: 20, display: "flex", flexDirection: "column", gap: 5 }}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isCarousel && <span style={{ fontSize: 9, color: C.accent, minWidth: 28 }}>#{currentSlide + 1}</span>}
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", minWidth: 28 }}>zoom</span>
              <input type="range" min="1" max="3" step="0.05"
                value={isCarousel ? getSlideScale(post, currentSlide) : (post.scale ?? 1)}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  if (isCarousel) {
                    const arr = [...(post.scales || [])];
                    while (arr.length <= currentSlide) arr.push(1);
                    arr[currentSlide] = val;
                    onUpdate("scales", arr);
                  } else {
                    onUpdate("scale", val);
                  }
                }}
                style={{ flex: 1, minWidth: 0, accentColor: C.accent, cursor: "pointer", height: 3 }}
              />
              <span style={{ fontSize: 9, color: C.accent, minWidth: 28, textAlign: "right" }}>{Math.round((isCarousel ? getSlideScale(post, currentSlide) : (post.scale ?? 1)) * 100)}%</span>
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
                  <div key={t} onClick={() => {
                    if (post.contentType === "Reel" && t !== "Reel") onUpdate("videoUrl", "");
                    onUpdate("contentType", t);
                    setShowTypeMenu(false);
                  }} style={{ padding: "7px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", background: t === post.contentType ? "#f0f4ff" : "white", color: t === post.contentType ? C.canvas : "#444" }}>{t}</div>
                ))}
              </div>
            )}
          </div>
        )}
        {mainImage && hovering && (
          <div style={{ position: "absolute", top: 6, right: 6, zIndex: 10, display: "flex", alignItems: "center", gap: 3 }} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
            {isCarousel && (
              <div style={{ display: "flex", alignItems: "center", background: "rgba(0,0,0,0.52)", borderRadius: 20, overflow: "hidden" }}>
                <button
                  onClick={() => onUpdate("carouselCardScale", Math.max(0.3, parseFloat(((post.carouselCardScale ?? 1) - 0.1).toFixed(2))))}
                  title="Shrink stack cards"
                  style={{ background: "none", color: "white", border: "none", width: 20, height: 20, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0 }}
                >−</button>
                <button
                  onClick={() => onUpdate("carouselCardScale", Math.min(1.5, parseFloat(((post.carouselCardScale ?? 1) + 0.1).toFixed(2))))}
                  title="Grow stack cards"
                  style={{ background: "none", color: "white", border: "none", width: 20, height: 20, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0 }}
                >+</button>
              </div>
            )}
            <button
              onClick={() => handleDelete()}
              title="Delete photo"
              style={{ background: "transparent", color: "white", border: "none", borderRadius: "50%", width: 22, height: 22, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
            >✕</button>
          </div>
        )}
        {(showPostingNotes || post.postingNotes) && (
          <div
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "22%", background: "rgba(255, 237, 80, 0.38)", borderBottomLeftRadius: 8, borderBottomRightRadius: 8, zIndex: 30, padding: "5px 7px", display: "flex", backdropFilter: "none" }}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            <textarea
              ref={postingNotesRef}
              value={post.postingNotes || ""}
              onChange={e => onUpdate("postingNotes", e.target.value)}
              placeholder="Posting notes..."
              readOnly={isExporting}
              style={{ width: "100%", height: "100%", background: "transparent", border: "none", outline: "none", resize: "none", fontFamily: "inherit", fontSize: 10, color: "rgba(50, 40, 0, 0.82)", lineHeight: 1.35, padding: 0, overflow: "hidden" }}
            />
          </div>
        )}
        {isCarousel && totalSlides >= 1 && (
          <div style={{ position: "absolute", inset: 0, overflow: "visible", zIndex: 5 }}>
          {totalSlides === 1 && (
            <div style={{ position: "absolute", bottom: 8, left: 8, right: 8, zIndex: 20, background: "rgba(19,19,19,0.82)", border: "1.5px dashed rgba(204,255,0,0.5)", borderRadius: 7, padding: "8px 10px", textAlign: "center", pointerEvents: "none" }}>
              <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, letterSpacing: "0.04em" }}>🎠 Drop more photos to build carousel</div>
            </div>
          )}
          {[...post.imageUrls].reverse().map((url, i) => {
            const total = post.imageUrls.length;
            const stackIdx = total - 1 - i;
              const baseCardW = total > 1 ? 100 / (0.3675 * (total - 1) + 1) : 70;
              const stackScale = post.carouselCardScale ?? 1;
              const cardW = baseCardW * stackScale;
              const spread = total > 1 ? (100 - cardW) / (total - 1) : 0;
              const leftPct = stackIdx * spread;
              const topPct = stackIdx * spread;
              const sCropX = getSlideCropX(post, stackIdx);
              const sCropY = getSlideCropY(post, stackIdx);
              const sScale = getSlideScale(post, stackIdx);
              const isSelected = stackIdx === currentSlide && reframing;
              return (
                <div key={i}
                onMouseDown={e => {
                  if (!isSelected) return;
                  e.preventDefault();
                  const startX = e.clientX, startY = e.clientY;
                  const startCropX = sCropX, startCropY = sCropY;
                  function onMove(ev) {
                    const dx = ((ev.clientX - startX) / 200) * -100;
                    const dy = ((ev.clientY - startY) / 200) * -100;
                    const arrX = [...(post.cropXs || [])];
                    const arrY = [...(post.cropYs || [])];
                    while (arrX.length <= stackIdx) arrX.push(50);
                    while (arrY.length <= stackIdx) arrY.push(50);
                    arrX[stackIdx] = Math.min(100, Math.max(0, startCropX + dx));
                    arrY[stackIdx] = Math.min(100, Math.max(0, startCropY + dy));
                    onUpdate("cropXs", arrX);
                    onUpdate("cropYs", arrY);
                  }
                  function onUp() {
                    document.removeEventListener("mousemove", onMove);
                    document.removeEventListener("mouseup", onUp);
                  }
                  document.addEventListener("mousemove", onMove);
                  document.addEventListener("mouseup", onUp);
                }}
                  onDoubleClick={e => { e.stopPropagation(); if (isSelected) { setReframing(false); } else { setSlideIdx(stackIdx); setReframing(true); } }}
                  style={{
                    position: "absolute",
                    top: isSelected ? 0 : `${topPct}%`,
                    left: isSelected ? 0 : `${leftPct}%`,
                    width: isSelected ? "100%" : `${cardW}%`,
                    aspectRatio: "4/5",
                  backgroundImage: `url(${url})`,
                  backgroundSize: sScale <= 1.05 ? "cover" : `${sScale * 100}%`,
                  backgroundPosition: `${sCropX}% ${sCropY}%`,
                  borderRadius: 4,
                  boxShadow: isSelected ? `0 0 0 2px ${C.accent}, 0 4px 12px rgba(0,0,0,0.2)` : "0 4px 12px rgba(0,0,0,0.2)",
                  zIndex: isSelected ? 50 : total - stackIdx,
                  cursor: isSelected ? "grab" : "pointer",

                }} />
            );
          })}
        </div>
        )}
      </div>

      {isReel && !isExporting && onPickReelLink && !post.videoUrl ? (
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <div style={{ flex: 1, background: "transparent", border: `1.5px solid ${C.canvas}`, borderRadius: 24, padding: "5px 0", textAlign: "center", fontSize: 11, fontWeight: 700, color: C.meta }}>Reel Link</div>
          <button onClick={onPickReelLink} title="Pick reel link from Drive" style={{ background: C.canvas, border: "none", color: C.accent, borderRadius: "50%", width: 28, height: 28, fontSize: 13, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>📁</button>
        </div>
      ) : isCarousel && totalSlides > 0 ? (
        <div style={{ background: C.canvas, borderRadius: 24, padding: "6px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: Math.max(2, 10 - Math.max(0, totalSlides - 5)), overflow: "hidden" }}>
          {Array.from({ length: totalSlides }, (_, i) => {
            const slideUrl = post.urls?.[i] || "";
            const fontSize = Math.max(7, 11 - Math.max(0, totalSlides - 10));
            return (
              <a key={i} href={slideUrl || "#"} data-pdf-link={slideUrl || ""} data-pdf-link-text={`Slide ${i + 1} Link`} target="_blank" rel="noreferrer"
                style={{ color: slideUrl ? "white" : "rgba(255,255,255,0.3)", fontSize, fontWeight: 700, textDecoration: slideUrl ? "underline" : "none", cursor: slideUrl ? "pointer" : "default" }}>
                {i + 1}
              </a>
            );
          })}
        </div>
      ) : (
        <a href={linkHref || "#"} data-pdf-link={linkHref || ""} data-pdf-link-text={isReel ? "Reel Link" : "Photo Link"} target="_blank" rel="noreferrer" style={{ background: C.canvas, color: "white", borderRadius: 24, padding: "6px 0", textAlign: "center", fontSize: 11, fontWeight: 700, textDecoration: "underline", display: "block", cursor: "pointer" }}>
          {isReel ? "Reel Link" : "Photo Link"}
        </a>
      )}
      <div style={{ border: "1.5px solid #e8e8e8", borderRadius: 8, padding: "14px 16px", flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#333", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Caption:
          {!isExporting && (
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button onClick={() => setShowPostingNotes(p => !p)} title="Posting notes" style={{ background: "none", border: "none", cursor: "pointer", padding: "0 2px", lineHeight: 1, opacity: showPostingNotes || post.postingNotes ? 1 : 0.4 }}>
                <svg aria-hidden="true" focusable="false" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ display: "block", color: showPostingNotes || post.postingNotes ? "#c8a800" : "#888" }}>
                  <path d="M3 3h13l5 5v13H3V3zm12 0v5h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M15 3v5h5" fill="rgba(0,0,0,0.15)"/>
                </svg>
              </button>
              <div ref={emojiPickerRef} style={{ position: "relative" }}>
                <button onClick={() => setShowEmojiPicker(p => !p)} title="Insert emoji" style={{ background: "none", border: "none", fontSize: 13, cursor: "pointer", padding: "0 2px", opacity: 0.55, lineHeight: 1, fontFamily: "inherit" }}>😊</button>
                {showEmojiPicker && (
                  <div style={{ position: "absolute", right: 0, top: "100%", zIndex: 200, background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 10, padding: 8, boxShadow: "0 4px 18px rgba(0,0,0,0.12)", display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 2, width: 226 }}>
                    {CAPTION_EMOJIS.map(e => (
                      <button key={e} onClick={() => { insertEmoji(e); setShowEmojiPicker(false); }} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", padding: 3, borderRadius: 5, lineHeight: 1 }}>{e}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <textarea ref={captionRef} value={post.caption || ""} onChange={e => onUpdate("caption", e.target.value)} placeholder="Caption..." rows={4} style={{ fontSize: 13, color: "#444", lineHeight: 1.7, width: "100%", border: "none", outline: "none", resize: "none", fontFamily: "inherit", background: "transparent", padding: 0, flex: 1, overflow: "hidden" }} />
      </div>
    </div>
  );
}
