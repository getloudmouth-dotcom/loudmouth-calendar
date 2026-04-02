// /api/export-data.js
// Serves calendar payload to Puppeteer using a short-lived Redis token.
// Token is single-use — deleted on first read.

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Missing token" });

  const payload = await redis.get(`export:${token}`);
  if (!payload) return res.status(404).json({ error: "Token expired or invalid" });

  // Single-use: delete immediately after retrieval
  await redis.del(`export:${token}`);

  res.setHeader("Access-Control-Allow-Origin", "*");
  return res.status(200).json(payload);
}