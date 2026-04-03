// /api/export-pdf.js
// Launches Puppeteer, navigates to the app in export mode, returns a PDF blob.

import fs from "fs";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import { randomUUID } from "crypto";

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

let _supabaseCache = { url: "", key: "", client: null };
function getSupabaseAdmin() {
  const url =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase URL or service key. Set VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_KEY (service role) in .env"
    );
  }
  if (
    _supabaseCache.client &&
    _supabaseCache.url === url &&
    _supabaseCache.key === key
  ) {
    return _supabaseCache.client;
  }
  _supabaseCache = { url, key, client: createClient(url, key) };
  return _supabaseCache.client;
}

function resolveAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:5173";
}

function defaultChromeExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  if (process.platform === "darwin") {
    const p = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    return fs.existsSync(p) ? p : null;
  }
  if (process.platform === "win32") {
    const p = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    return fs.existsSync(p) ? p : null;
  }
  return null;
}

async function launchBrowser() {
  const chrome = defaultChromeExecutable();
  if (chrome) {
    return puppeteer.launch({
      executablePath: chrome,
      headless: "new",
      defaultViewport: { width: 1440, height: 900 },
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
  }
  return puppeteer.launch({
    args: [
      ...chromium.args.filter(arg => arg !== "--no-zygote"),
      "--font-render-hinting=none",
      "--run-all-compositor-stages-before-draw",
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

const APP_URL = resolveAppUrl();

export default async function handler(req, res) {
  // Warm-up ping — returns immediately to keep function hot
  if (req.method === "HEAD") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const raw = req.body?.calendarId;
  const calendarId =
    typeof raw === "string" ? raw.trim() : raw != null ? String(raw) : "";
  if (!calendarId) return res.status(400).json({ error: "Missing calendarId" });

  try {
    getSupabaseAdmin();
    getRedis();
  } catch (e) {
    return res.status(503).json({ error: e.message });
  }
  const supabase = getSupabaseAdmin();

  // 1. Fetch the calendar record
  const { data: cal, error: calErr } = await supabase
    .from("calendars")
    .select("*")
    .eq("id", calendarId)
    .single();
  if (calErr || !cal) {
    return res.status(404).json({
      error: "Calendar not found",
      detail: calErr?.message || null,
      code: calErr?.code || null,
      hint:
        "Use the same Supabase project as the app: set VITE_SUPABASE_URL and a matching service role key (SUPABASE_SERVICE_KEY).",
    });
  }

  // 2. Fetch the most recent draft snapshot
  const { data: draft, error: draftErr } = await supabase
    .from("calendar_drafts")
    .select("*")
    .eq("calendar_id", calendarId)
    .order("saved_at", { ascending: false })
    .limit(1)
    .single();
  if (draftErr || !draft) {
    return res.status(404).json({
      error: "No draft found",
      detail: draftErr?.message || null,
      code: draftErr?.code || null,
    });
  }

  // 3. Store payload in Redis with 120s TTL
  const token = randomUUID();
  const payload = {
    posts: draft.posts,
    clientName: cal.client_name,
    month: cal.month,
    year: cal.year,
    postsPerPage: cal.posts_per_page,
    builderName: cal.builder_name,
    selectedDays: cal.selected_days,
  };
  await getRedis().set(`export:${token}`, JSON.stringify(payload), { ex: 120 });

  // 4. Launch Puppeteer
  let browser = null;
  try {
    browser = await launchBrowser();

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

    // Pipe headless browser logs into Vercel function logs for debugging
    page.on("console", msg => console.log(`[headless:${msg.type()}]`, msg.text()));
    page.on("pageerror", err => console.error("[headless:pageerror]", err.message));
    page.on("requestfailed", req =>
      console.error("[headless:reqfailed]", req.url(), req.failure()?.errorText)
    );

    // Navigate to the app in export mode
    await page.goto(`${APP_URL}/?exportToken=${token}`, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    });

    // Wait for app to signal all images loaded + fonts settled (or a fetch error)
    await page.waitForFunction(
      "window.__EXPORT_READY__ === true || window.__EXPORT_ERROR__ === true",
      { timeout: 12000, polling: 200 }
    );
    const exportError = await page.evaluate(() => !!window.__EXPORT_ERROR__);
    if (exportError) throw new Error("Export data failed to load in headless browser");

    await page.evaluate(async () => {
      try {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
      } catch {
        /* ignore */
      }
    });
    await page.emulateMediaType("print");
    await new Promise(r => setTimeout(r, 500));

    const { pageWidth, pageHeight } = await page.evaluate(() => {
        const el = document.querySelector(".cal-page");
        if (!el) return { pageWidth: 1440, pageHeight: 1021 };
        const r = el.getBoundingClientRect();
        return { pageWidth: Math.round(r.width), pageHeight: Math.round(r.height) };
      });
  
      const pdfBuffer = await page.pdf({
        printBackground: true,
        width: `${(pageWidth / 96).toFixed(4)}in`,
        height: `${(pageHeight / 96).toFixed(4)}in`,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
        timeout: 30000,
      });

    const base64Pdf = Buffer.from(pdfBuffer).toString("base64");
    return res.status(200).json({
      pdf: base64Pdf,
      filename: `${cal.client_name}-content-calendar.pdf`,
    });

  } catch (err) {
    console.error("PDF export error:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
}