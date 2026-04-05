import sharp from "sharp";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { createClient } from "@supabase/supabase-js";

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "rl:thumb",
});

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

export default async function handler(req, res) {
  const { fileId } = req.query;
  const auth = req.headers.authorization;

  if (!fileId || !auth) {
    return res.status(400).json({ error: "Missing fileId or token" });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() ?? req.socket.remoteAddress ?? "unknown";
  const { success, reset } = await ratelimit.limit(ip);
  if (!success) {
    res.setHeader("Retry-After", Math.ceil((reset - Date.now()) / 1000));
    return res.status(429).json({ error: "Too many requests." });
  }

  // ── 1. Check Supabase table (CDN URL) ──
  try {
    const { data } = await supabase
      .from("thumbnail_cache")
      .select("cdn_url")
      .eq("file_id", fileId)
      .single();

    if (data?.cdn_url) {
      res.setHeader("X-Cache", "CDN-HIT");
      return res.status(200).json({ cdnUrl: data.cdn_url });
    }
  } catch (e) {
    console.warn("Supabase lookup failed:", e.message);
  }

  // ── 2. Check Upstash KV (Phase 1 fallback) ──
  try {
    const cached = await kv.get(`thumb:${fileId}`);
    if (cached) {
      const buffer = Buffer.from(cached, "base64");
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("X-Cache", "KV-HIT");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(buffer);
    }
  } catch (e) {
    console.warn("KV read failed:", e.message);
  }

  // ── 3. Cache miss — fetch from Drive ──
  try {
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: auth } }
    );

    if (driveRes.status === 401) {
      return res.status(401).json({ error: "Drive token expired" });
    }
    if (!driveRes.ok) {
      return res.status(driveRes.status).json({ error: "Drive fetch failed" });
    }

    const buffer = Buffer.from(await driveRes.arrayBuffer());
    const thumb = await sharp(buffer)
      .resize(400, 400, { fit: "cover", position: "centre" })
      .jpeg({ quality: 78 })
      .toBuffer();

    // ── 4. Upload to Supabase Storage ──
    let cdnUrl = null;
    try {
      const path = `thumbs/${fileId}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("thumbnails")
        .upload(path, thumb, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("thumbnails")
          .getPublicUrl(path);
        cdnUrl = urlData.publicUrl;

        // Store mapping in table
        await supabase.from("thumbnail_cache").upsert({
          file_id: fileId,
          cdn_url: cdnUrl,
        });

        // Also store in KV as base64 fallback
        await kv.set(`thumb:${fileId}`, thumb.toString("base64"), { ex: 604800 });

        res.setHeader("X-Cache", "MISS");
        res.setHeader("Content-Type", "application/json");
        return res.status(200).json({ cdnUrl });
      }
    } catch (e) {
      console.warn("Supabase upload failed:", e.message);
    }

    // ── 5. Supabase upload failed — serve blob directly ──
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(thumb);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}