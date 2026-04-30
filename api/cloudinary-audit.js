// /api/cloudinary-audit.js
// Vercel cron: runs every Sunday at 3 AM UTC.
// Deletes Cloudinary assets in the `loudmouth` folder that are no longer
// referenced in any active calendar draft (top 25 per calendar).
//
// Protected by Authorization: Bearer <CRON_SECRET>
// Requires: CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET env vars

import { createClient } from "@supabase/supabase-js";
import { withSentry } from './_sentry.js';

const CLOUD_NAME = "djaxz6tef";

let _sbAdmin = null;
function getSupabaseAdmin() {
  if (_sbAdmin) return _sbAdmin;
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL or service role key.");
  _sbAdmin = createClient(url, key, { auth: { persistSession: false } });
  return _sbAdmin;
}

function getCloudinaryAuth() {
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!key || !secret) throw new Error("Missing CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET.");
  return "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
}

// Extract public_id from a Cloudinary URL
// e.g. https://res.cloudinary.com/cloud/image/upload/v123/abc123.jpg → "abc123"
function publicIdFromUrl(url) {
  const match = url?.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^./]+)?$/);
  return match ? match[1] : null;
}

// Fetch all assets in the loudmouth folder from Cloudinary
async function listLoudmouthAssets(auth) {
  const assets = [];
  let nextCursor = null;
  do {
    const body = {
      expression: "asset_folder:loudmouth",
      max_results: 500,
      fields: "public_id",
      ...(nextCursor ? { next_cursor: nextCursor } : {}),
    };
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/search`,
      {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) throw new Error(`Cloudinary search failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    assets.push(...(data.resources || []));
    nextCursor = data.next_cursor ?? null;
  } while (nextCursor);
  return assets;
}

// Delete up to 100 assets at once by public_id
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

// Get all Cloudinary public_ids referenced in active drafts (top 25 per calendar)
async function getReferencedPublicIds(sb) {
  const { data: drafts, error } = await sb
    .from("calendar_drafts")
    .select("calendar_id, posts, saved_at")
    .order("saved_at", { ascending: false });

  if (error) throw new Error(`Supabase query failed: ${error.message}`);

  // Keep only top 25 per calendar (matches retention policy)
  const countByCalendar = {};
  const activeDrafts = [];
  for (const draft of drafts) {
    const count = countByCalendar[draft.calendar_id] ?? 0;
    if (count < 25) {
      activeDrafts.push(draft);
      countByCalendar[draft.calendar_id] = count + 1;
    }
  }

  const referencedPublicIds = new Set();
  for (const draft of activeDrafts) {
    const posts = draft.posts ?? {};
    for (const dayPosts of Object.values(posts)) {
      if (!Array.isArray(dayPosts)) continue;
      for (const post of dayPosts) {
        for (const url of post.imageUrls ?? []) {
          if (!url?.includes("cloudinary")) continue;
          const pid = publicIdFromUrl(url);
          if (pid) referencedPublicIds.add(pid);
        }
      }
    }
  }

  return referencedPublicIds;
}

async function handler(req, res) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const sb = getSupabaseAdmin();
    const auth = getCloudinaryAuth();

    const [cloudinaryAssets, referencedPublicIds] = await Promise.all([
      listLoudmouthAssets(auth),
      getReferencedPublicIds(sb),
    ]);

    const orphans = cloudinaryAssets
      .map((a) => a.public_id)
      .filter((pid) => !referencedPublicIds.has(pid));

    if (orphans.length === 0) {
      return res.status(200).json({ deleted: 0, message: "Nothing to clean up." });
    }

    // Delete in batches of 100 (Cloudinary API limit)
    let deleted = 0;
    for (let i = 0; i < orphans.length; i += 100) {
      const batch = orphans.slice(i, i + 100);
      await deleteByPublicIds(batch, auth);
      deleted += batch.length;
    }

    return res.status(200).json({
      deleted,
      total_in_cloudinary: cloudinaryAssets.length,
      active_references: referencedPublicIds.size,
    });
  } catch (err) {
    console.error("[cloudinary-audit]", err);
    return res.status(500).json({ error: err.message });
  }
}

export default withSentry(handler);
