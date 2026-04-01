import sharp from "sharp";
import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  const { fileId } = req.query;
  const auth = req.headers.authorization;

  if (!fileId || !auth) {
    return res.status(400).json({ error: "Missing fileId or token" });
  }

  const cacheKey = `thumb:${fileId}`;

  // ── 1. Check KV cache ──
  try {
    const cached = await kv.get(cacheKey);
    if (cached) {
      const buffer = Buffer.from(cached, "base64");
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(buffer);
    }
  } catch (kvErr) {
    console.warn("KV read failed, falling through:", kvErr.message);
  }

  // ── 2. Cache miss — fetch from Drive ──
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

    // ── 3. Store in KV — 7 day TTL ──
    try {
      await kv.set(cacheKey, thumb.toString("base64"), { ex: 604800 });
    } catch (kvErr) {
      console.warn("KV write failed:", kvErr.message);
    }

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(thumb);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}