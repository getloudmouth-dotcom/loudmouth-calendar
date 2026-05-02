import { CLOUDINARY_CLOUD, CLOUDINARY_PRESET } from "./constants";

export function readExportToken() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("exportToken");
}

export function readContentPlanToken() {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  return p.get("cp") || p.get("contentPlanToken");
}

export function readCPExportToken() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("contentPlanExportToken");
}

export function readBillingExportToken() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("billingExportToken");
}

export function readCalendarIdFromUrl() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("calendarId");
}

export function setCalendarIdInUrl(id) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("calendarId", id);
  else url.searchParams.delete("calendarId");
  const next = url.pathname + (url.search ? url.search : "") + url.hash;
  if (next === window.location.pathname + window.location.search + window.location.hash) return;
  window.history.replaceState(null, "", next);
}

export async function compressToBlob(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
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

export async function uploadToCloudinary(fileOrBlob) {
  if (!fileOrBlob) throw new Error("Image failed to process — file may be corrupt or unsupported.");
  const form = new FormData();
  form.append("file", fileOrBlob);
  form.append("upload_preset", CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: "POST", body: form });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.secure_url;
}

export function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
export function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
export function getDayName(year, month, day) { return new Date(year, month, day).toLocaleDateString("en-US", { weekday: "long" }); }
export function formatDate(month, day) { return `${String(month + 1).padStart(2, "0")}/${String(day).padStart(2, "0")}`; }
export function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// Lazy-loads the Google Identity Services script on first call, then resolves.
// Subsequent calls resolve immediately from the module-level promise cache.
let _gsiPromise = null;
export function loadGsiScript() {
  if (_gsiPromise) return _gsiPromise;
  _gsiPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => { _gsiPromise = null; reject(new Error("Failed to load Google auth")); };
    document.head.appendChild(script);
  });
  return _gsiPromise;
}

// Per-slide crop/scale helpers for carousels
export function getSlideCropX(post, slideIdx) { return post.cropXs?.[slideIdx] ?? post.cropX ?? 50; }
export function getSlideCropY(post, slideIdx) { return post.cropYs?.[slideIdx] ?? post.cropY ?? 50; }
export function getSlideScale(post, slideIdx) { return post.scales?.[slideIdx] ?? post.scale ?? 1; }

// calendar_drafts.posts is keyed by day with arrays of post records.
// Flatten into a stable array of grid items used by both GridView and
// GridCreatorPortal. Non-numeric keys (e.g. `_meta`) are skipped. Stories are
// excluded — they don't appear on an Instagram profile grid, and the calendar
// editor's `Feed:` preview / PDF feed grid both filter them too. If
// `_meta.feedOrder` is present (a list of "day-postIdx" keys saved by the
// solo Feed Grid), the items are returned in that order so a user's reorder
// is preserved across reloads.
export function postsToGridItems(postsObj) {
  if (!postsObj || typeof postsObj !== "object") return [];
  const items = Object.entries(postsObj)
    .filter(([day]) => Number.isFinite(Number(day)))
    .flatMap(([day, dayPosts]) =>
      (dayPosts || []).map((p, postIdx) => ({ ...p, _day: Number(day), _postIdx: postIdx }))
    )
    .filter(p => p.contentType !== "Story")
    .sort((a, b) => a._day - b._day || a._postIdx - b._postIdx)
    .map(p => ({ id: p.id || `${p._day}-${p._postIdx}`, imageUrl: p.imageUrls?.[0] || null, _src: p }));

  const feedOrder = postsObj._meta?.feedOrder;
  if (!Array.isArray(feedOrder) || feedOrder.length === 0) return items;

  const keyOf = (it) => `${it._src._day}-${it._src._postIdx ?? 0}`;
  const byKey = new Map(items.map(it => [keyOf(it), it]));
  const ordered = [];
  for (const k of feedOrder) {
    const it = byKey.get(k);
    if (it) { ordered.push(it); byKey.delete(k); }
  }
  // Anything not referenced by feedOrder (e.g. posts added via the calendar
  // editor since the last solo-grid save) lands at the tail in default order.
  for (const it of byKey.values()) ordered.push(it);
  return ordered;
}

// Persist a reordered grid back to calendar_drafts.posts WITHOUT renumbering
// day keys. Each visible item is written back under its original _day /
// _postIdx slot, Stories (and any other posts not in `items`) are seeded from
// `originalPostsObj` so they survive the round-trip, and the visual order is
// captured in `_meta.feedOrder`. This keeps the calendar editor in sync with
// `selected_days`: posts stay on the days they were assigned to.
export function gridItemsToPostsObj(items, meta, originalPostsObj) {
  const out = {};
  let maxDay = 0;

  if (originalPostsObj && typeof originalPostsObj === "object") {
    for (const [k, v] of Object.entries(originalPostsObj)) {
      if (k === "_meta") continue;
      if (!Number.isFinite(Number(k))) continue;
      out[k] = Array.isArray(v) ? v.map(p => ({ ...p })) : v;
      maxDay = Math.max(maxDay, Number(k));
    }
  }

  let nextNewDay = maxDay;
  const feedOrder = [];

  items.forEach((item) => {
    const src = item._src || {};
    const persisted = { ...src, imageUrls: item.imageUrl ? [item.imageUrl] : [], id: item.id };
    delete persisted._day;
    delete persisted._postIdx;

    if (Number.isFinite(src._day)) {
      const day = src._day;
      const postIdx = src._postIdx ?? 0;
      if (!Array.isArray(out[day])) out[day] = [];
      out[day][postIdx] = persisted;
      feedOrder.push(`${day}-${postIdx}`);
    } else {
      // Newly added image with no prior day. Park it on a fresh key past the
      // last known day so existing day-bound posts aren't disturbed. It won't
      // render in the calendar editor until the day is added to selected_days,
      // but the data round-trips cleanly.
      nextNewDay += 1;
      out[nextNewDay] = [persisted];
      feedOrder.push(`${nextNewDay}-0`);
    }
  });

  // Sparse writes (postIdx beyond seeded length) leave undefined holes —
  // compact them so reads see a clean array.
  for (const k of Object.keys(out)) {
    if (Array.isArray(out[k])) out[k] = out[k].filter(p => p != null);
  }

  out._meta = { ...(originalPostsObj?._meta || {}), ...(meta || {}), feedOrder };
  return out;
}


export async function deleteCloudinaryAssets(urls, accessToken) {
  const cloudinaryUrls = (urls ?? []).filter(u => typeof u === "string" && u.includes("res.cloudinary.com"));
  if (!cloudinaryUrls.length) return;
  try {
    await fetch("/api/delete-assets", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
      body: JSON.stringify({ urls: cloudinaryUrls }),
    });
  } catch (e) {
    console.warn("[deleteCloudinaryAssets] non-fatal:", e.message);
  }
}
