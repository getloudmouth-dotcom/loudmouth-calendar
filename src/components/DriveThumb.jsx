import { useState, useRef, useEffect } from "react";

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

export const _thumbCache = new Map(); // persists for entire browser session

export async function prefetchThumbnails(imageFiles, token) {
  if (!token) return;
  const toFetch = imageFiles.filter(f => f.id && !_thumbCache.has(f.id));
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

export default function DriveThumb({ fileId, thumbnailLink, token, name, imgStyle, mimeType }) {
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
    if (!fileId || !token) { setSrc("err"); return; }
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
      {src && src !== "err" && <img src={src} alt={name} style={imgStyle} onError={() => { _thumbCache.delete(fileId); setSrc("err"); }} />}
      {src === "err" && (
        mimeType && mimeType.startsWith("video/") ? (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, background: "#1a1a2e", padding: "4px 6px" }}>
            <span style={{ fontSize: 18 }}>🎬</span>
            <span style={{ fontSize: 7, color: "rgba(215,250,6,0.8)", fontWeight: 700, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "90%", display: "block" }}>{(name || "").replace(/\.[^.]+$/, "").slice(0, 20)}</span>
          </div>
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", fontSize: 20 }}>🖼</div>
        )
      )}
    </div>
  );
}
