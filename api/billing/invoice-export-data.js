// api/billing/invoice-export-data.js
// Serves invoice payload to Puppeteer via a short-lived Redis token.
// Called by the headless browser during PDF generation — no auth required
// (the token itself is the credential; it expires in 120s and is single-use).

import { Redis } from "@upstash/redis";
import { withSentry } from '../_sentry.js';

let _redisCache = { url: "", token: "", client: null };
function getRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("Missing KV_REST_API_URL or KV_REST_API_TOKEN");
  if (_redisCache.client && _redisCache.url === url && _redisCache.token === token) {
    return _redisCache.client;
  }
  _redisCache = { url, token, client: new Redis({ url, token }) };
  return _redisCache.client;
}

async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Missing token" });

  let redis;
  try {
    redis = getRedis();
  } catch (e) {
    return res.status(503).json({ error: e.message });
  }

  const payload = await redis.get(`billinvoice:${token}`);
  if (!payload) return res.status(404).json({ error: "Token expired or invalid" });

  // Single-use — delete immediately after retrieval
  await redis.del(`billinvoice:${token}`);

  const origin = process.env.APP_URL
    ? process.env.APP_URL.replace(/\/$/, "")
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:5173";

  res.setHeader("Access-Control-Allow-Origin", origin);
  return res.status(200).json(payload);
}

export default withSentry(handler);
