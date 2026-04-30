// POST /api/delete-assets  { urls: string[] }
// Authorization: Bearer <user JWT>
// Deletes Cloudinary assets by URL. Called before deleting calendars/clients.

import { createClient } from "@supabase/supabase-js";

const CLOUD_NAME = "djaxz6tef";

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL or service role key.");
  return createClient(url, key, { auth: { persistSession: false } });
}

function getCloudinaryAuth() {
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!key || !secret) throw new Error("Missing CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET.");
  return "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
}

function publicIdFromUrl(url) {
  const match = url?.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^./]+)?$/);
  return match ? match[1] : null;
}

async function deleteByPublicIds(publicIds, auth) {
  const params = new URLSearchParams();
  for (const id of publicIds) params.append("public_ids[]", id);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/upload?${params}`,
    { method: "DELETE", headers: { Authorization: auth } }
  );
  if (!res.ok) throw new Error(`Cloudinary delete failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing auth token" });

  const token = authHeader.slice(7);
  const sbAdmin = getSupabaseAdmin();
  const { data: { user }, error: authError } = await sbAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { urls } = req.body || {};
  if (!Array.isArray(urls) || urls.length === 0) return res.status(200).json({ deleted: 0 });

  const cloudinaryUrls = urls.filter(u => typeof u === "string" && u.includes("res.cloudinary.com"));
  const publicIds = cloudinaryUrls.map(publicIdFromUrl).filter(Boolean);
  if (publicIds.length === 0) return res.status(200).json({ deleted: 0 });

  try {
    const auth = getCloudinaryAuth();
    // batch in chunks of 100 (Cloudinary API limit)
    for (let i = 0; i < publicIds.length; i += 100) {
      await deleteByPublicIds(publicIds.slice(i, i + 100), auth);
    }
    return res.status(200).json({ deleted: publicIds.length });
  } catch (e) {
    console.error("[delete-assets] Cloudinary error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
