import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const ratelimit = new Ratelimit({ redis: kv, limiter: Ratelimit.slidingWindow(30, "1 m"), prefix: "rl:pinterest" });

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

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

  // Format: resource_response.data (array of pins or board object with pins)
  const rdata = data?.resource_response?.data;
  if (Array.isArray(rdata)) { rdata.forEach(tryPin); return pins; }
  if (rdata?.pins) { rdata.pins.forEach(tryPin); return pins; }

  // Format: top-level array
  if (Array.isArray(data)) { data.forEach(tryPin); return pins; }

  // Deep search for pins array in any nested object
  function search(obj, depth = 0) {
    if (depth > 6 || !obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) { obj.forEach(item => { if (item?.id && item?.images) tryPin(item); else search(item, depth + 1); }); return; }
    for (const val of Object.values(obj)) search(val, depth + 1);
  }
  search(data);

  return pins;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "invalid_url", message: "Missing board URL" });

  const parsed = parsePinterestUrl(url);
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

  // Try Pinterest's internal resource endpoint (most reliable for public boards)
  const resourceUrl = `https://www.pinterest.com/resource/BoardFeedResource/get/?source_url=${encodeURIComponent(boardPath)}&data=${encodeURIComponent(JSON.stringify({ options: { board_url: boardPath, page_size: 50, prepend: false }, context: {} }))}&_=${Date.now()}`;

  try {
    const resp = await fetch(resourceUrl, {
      headers: {
        "User-Agent": UA,
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.9",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": `https://www.pinterest.com${boardPath}`,
        "X-APP-VERSION": "db7f950",
        "X-Pinterest-AppState": "active",
      },
    });

    if (resp.status === 404) {
      return res.status(404).json({ error: "not_found", message: "Couldn't load that board — it may be private or the URL is incorrect." });
    }
    if (resp.status === 401 || resp.status === 403) {
      return res.status(403).json({ error: "private", message: "Couldn't load that board — it may be private or the URL is incorrect." });
    }
    if (!resp.ok) {
      throw new Error(`Pinterest returned ${resp.status}`);
    }

    const data = await resp.json();
    const pins = extractPins(data);

    if (pins.length === 0) {
      return res.status(200).json({ pins: [], empty: true, message: "This board appears to be empty." });
    }

    return res.status(200).json({ pins });
  } catch (e) {
    console.error("Pinterest board fetch error:", e.message);
    return res.status(502).json({ error: "fetch_failed", message: "Something went wrong loading the board. Please try again." });
  }
}
