import { CLOUDINARY_CLOUD, CLOUDINARY_PRESET } from "./constants";

export function readExportToken() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("exportToken");
}

export function readContentPlanToken() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("contentPlanToken");
}

export function readCPExportToken() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("contentPlanExportToken");
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

// Per-slide crop/scale helpers for carousels
export function getSlideCropX(post, slideIdx) { return post.cropXs?.[slideIdx] ?? post.cropX ?? 50; }
export function getSlideCropY(post, slideIdx) { return post.cropYs?.[slideIdx] ?? post.cropY ?? 50; }
export function getSlideScale(post, slideIdx) { return post.scales?.[slideIdx] ?? post.scale ?? 1; }
