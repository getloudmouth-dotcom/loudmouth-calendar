import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { withSentry } from './_sentry.js';

const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const ratelimit = new Ratelimit({ redis: kv, limiter: Ratelimit.slidingWindow(30, "1 m"), prefix: "rl:pinterest" });

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function resolveUrl(raw) {
  const full = raw.startsWith("http") ? raw : `https://${raw}`;
  const parsed = new URL(full);
  if (parsed.hostname === "pin.it" || parsed.hostname === "www.pin.it") {
    const resp = await fetch(full, { method: "HEAD", redirect: "follow", headers: { "User-Agent": UA } });
    return resp.url;
  }
  return full;
}

function parsePinterestUrl(raw) {
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (!url.hostname.includes("pinterest")) return null;
    const parts = url.pathname.replace(/^\/|\/$/g, "").split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { username: parts[0], board: parts[1] };
  } catch {
    return null;
  }
}

function extractPins(data) {
  const pins = [];
  const seen = new Set();

  function tryPin(pin) {
    if (!pin?.id || seen.has(String(pin.id))) return;
    seen.add(String(pin.id));
    const imgs = pin.images || pin.image;
    let imageUrl = null;
    if (imgs) {
      imageUrl = imgs["736x"]?.url || imgs["600x"]?.url || imgs["474x"]?.url || imgs["236x"]?.url || imgs["orig"]?.url;
    }
    if (!imageUrl && typeof pin.image_url === "string") imageUrl = pin.image_url;
    if (!imageUrl) return;
    pins.push({ id: String(pin.id), title: pin.title || pin.description || "", image_url: imageUrl });
  }

  const rdata = data?.resource_response?.data;
  if (Array.isArray(rdata)) { rdata.forEach(tryPin); return pins; }
  if (rdata?.pins) { rdata.pins.forEach(tryPin); return pins; }
  if (Array.isArray(data)) { data.forEach(tryPin); return pins; }

  function search(obj, depth = 0) {
    if (depth > 8 || !obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      obj.forEach(item => { if (item?.id && (item?.images || item?.image_url)) tryPin(item); else search(item, depth + 1); });
      return;
    }
    for (const val of Object.values(obj)) search(val, depth + 1);
  }
  search(data);

  return pins;
}

// Parse pins out of Pinterest's server-rendered HTML page (embedded JSON blobs)
function extractPinsFromHtml(html) {
  const pins = [];
  const seen = new Set();

  // Pinterest embeds data in multiple script tags — scan all of them
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRe.exec(html)) !== null) {
    const content = match[1];
    // Look for objects that have image URLs in Pinterest's CDN
    const pinRe = /"id"\s*:\s*"(\d+)"[\s\S]{0,500}?"https:\/\/i\.pinimg\.com\/[^"]+"/g;
    if (!pinRe.test(content)) continue;

    try {
      // Try to parse any JSON object in this script block
      const jsonRe = /\{[\s\S]+\}/g;
      let jMatch;
      while ((jMatch = jsonRe.exec(content)) !== null) {
        try {
          const obj = JSON.parse(jMatch[0]);
          extractPins(obj).forEach(p => {
            if (!seen.has(p.id)) { seen.add(p.id); pins.push(p); }
          });
        } catch { /* not valid JSON, skip */ }
        if (pins.length > 0) break;
      }
    } catch { /* skip */ }
    if (pins.length > 0) break;
  }

  // Fallback: extract image URLs directly from pinimg CDN references in the HTML
  if (pins.length === 0) {
    const imgRe = /"(https:\/\/i\.pinimg\.com\/\d+x\/[^"]+\.jpg)"/g;
    const idRe = /"id"\s*:\s*"(\d+)"/g;
    const imgUrls = [...html.matchAll(/"(https:\/\/i\.pinimg\.com\/736x\/[^"]+\.jpg)"/g)].map(m => m[1]);
    imgUrls.forEach((url, i) => {
      const id = String(i + 1);
      if (!seen.has(id)) { seen.add(id); pins.push({ id, title: "", image_url: url }); }
    });
  }

  return pins;
}

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "invalid_url", message: "Missing board URL" });

  let resolvedUrl = url;
  try {
    resolvedUrl = await resolveUrl(url);
  } catch {
    return res.status(400).json({ error: "invalid_url", message: "That doesn't look like a Pinterest board URL. Use: pinterest.com/username/boardname" });
  }

  const parsed = parsePinterestUrl(resolvedUrl);
  if (!parsed) {
    return res.status(400).json({ error: "invalid_url", message: "That doesn't look like a Pinterest board URL. Use: pinterest.com/username/boardname" });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() ?? req.socket?.remoteAddress ?? "unknown";
  const { success, reset } = await ratelimit.limit(ip);
  if (!success) {
    res.setHeader("Retry-After", Math.ceil((reset - Date.now()) / 1000));
    return res.status(429).json({ error: "rate_limit", message: "Too many requests. Wait a moment and try again." });
  }

  const { username, board } = parsed;
  const boardPath = `/${username}/${board}/`;
  const boardPageUrl = `https://www.pinterest.com${boardPath}`;

  const headers = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Upgrade-Insecure-Requests": "1",
  };

  try {
    // Fetch the public board page HTML
    const resp = await fetch(boardPageUrl, { headers, redirect: "follow" });

    if (resp.status === 404) {
      return res.status(404).json({ error: "not_found", message: "Couldn't find that board — check the URL and try again." });
    }
    if (resp.status === 401 || resp.status === 403) {
      return res.status(403).json({ error: "private", message: "Couldn't load that board — it may be private or require login." });
    }
    if (!resp.ok) {
      throw new Error(`Pinterest returned ${resp.status}`);
    }

    const html = await resp.text();

    // Pinterest 404s redirect to the homepage — detect by missing board content
    if (!html.includes("pinimg.com") && !html.includes(username)) {
      return res.status(404).json({ error: "not_found", message: "Couldn't find that board — it may have been deleted or made private." });
    }

    const pins = extractPinsFromHtml(html);

    if (pins.length === 0) {
      return res.status(200).json({ pins: [], empty: true, message: "No images found on this board. It may be empty or Pinterest may be limiting access — try the OAuth option instead." });
    }

    return res.status(200).json({ pins });
  } catch (e) {
    console.error("Pinterest board fetch error:", e.message);
    return res.status(502).json({ error: "fetch_failed", message: "Something went wrong loading the board. Please try again." });
  }
}

export default withSentry(handler);
