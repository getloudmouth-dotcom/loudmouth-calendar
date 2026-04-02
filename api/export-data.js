// /api/export-data.js
// Serves calendar payload to Puppeteer using a short-lived Redis token.
// Token is single-use — deleted on first read.

import { Redis } from "@upstash/redis";

let _redisCache = { url: "", token: "", client: null };
function getRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Missing KV_REST_API_URL or KV_REST_API_TOKEN (set in .env for local dev)"
    );
  }
  if (
    _redisCache.client &&
    _redisCache.url === url &&
    _redisCache.token === token
  ) {
    return _redisCache.client;
  }
  _redisCache = { url, token, client: new Redis({ url, token }) };
  return _redisCache.client;
}

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Missing token" });

  let redis;
  try {
    redis = getRedis();
  } catch (e) {
    return res.status(503).json({ error: e.message });
  }

  const payload = await redis.get(`export:${token}`);
  if (!payload) return res.status(404).json({ error: "Token expired or invalid" });

  // Single-use: delete immediately after retrieval
  await redis.del(`export:${token}`);

  res.setHeader("Access-Control-Allow-Origin", "*");
  return res.status(200).json(payload);
}