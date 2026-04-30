// /api/export-content-plan-pdf.js
// POST body: { planId }
// Authorization: Bearer <user JWT>
// Launches Puppeteer, navigates to the app in content plan export mode, returns a PDF.

import fs from "fs";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import { randomUUID } from "crypto";
import { withSentry } from './_sentry.js';

let _redisCache = { url: "", token: "", client: null };
function getRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("Missing KV_REST_API_URL or KV_REST_API_TOKEN");
  if (_redisCache.client && _redisCache.url === url && _redisCache.token === token) return _redisCache.client;
  _redisCache = { url, token, client: new Redis({ url, token }) };
  return _redisCache.client;
}

let _supabaseCache = { url: "", key: "", client: null };
function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or service key");
  if (_supabaseCache.client && _supabaseCache.url === url && _supabaseCache.key === key) return _supabaseCache.client;
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
      defaultViewport: { width: 1200, height: 900 },
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return puppeteer.launch({
    args: [...chromium.args.filter(arg => arg !== "--no-zygote"), "--font-render-hinting=none"],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

const APP_URL = resolveAppUrl();

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!accessToken) return res.status(401).json({ error: "Unauthorized" });

  let sb, redis;
  try { sb = getSupabaseAdmin(); redis = getRedis(); } catch (e) { return res.status(503).json({ error: e.message }); }

  const { data: { user }, error: authErr } = await sb.auth.getUser(accessToken);
  if (authErr || !user) return res.status(401).json({ error: "Unauthorized" });

  const { planId } = req.body || {};
  if (!planId) return res.status(400).json({ error: "Missing planId" });

  const { data: plan, error: planErr } = await sb.from("content_plans").select("*").eq("id", planId).single();
  if (planErr || !plan) return res.status(404).json({ error: "Plan not found" });
  if (plan.user_id !== user.id) return res.status(403).json({ error: "Forbidden" });

  const { data: items } = await sb
    .from("content_plan_items")
    .select("*")
    .eq("plan_id", planId)
    .order("item_type")
    .order("item_number");

  const token = randomUUID();
  await redis.set(`cpexport:${token}`, JSON.stringify({ plan, items: items || [] }), { ex: 120 });

  let browser = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 1 });

    page.on("console", msg => console.log(`[headless:${msg.type()}]`, msg.text()));
    page.on("pageerror", err => console.error("[headless:pageerror]", err.message));

    await page.goto(`${APP_URL}/?contentPlanExportToken=${token}`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    await page.waitForFunction(
      "window.__CP_EXPORT_READY__ === true || window.__CP_EXPORT_ERROR__ === true",
      { timeout: 15000, polling: 200 }
    );

    const exportError = await page.evaluate(() => !!window.__CP_EXPORT_ERROR__);
    if (exportError) throw new Error("Export data failed to load in headless browser");

    await page.evaluate(async () => {
      try { if (document.fonts?.ready) await document.fonts.ready; } catch {}
    });
    await page.emulateMediaType("print");
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

    // Use A4 portrait dimensions
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });

    const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const base64Pdf = Buffer.from(pdfBuffer).toString("base64");
    const filename = `${plan.client_name.toLowerCase().replace(/\s+/g, "-")}-content-plan-${MONTHS[plan.month].toLowerCase()}-${plan.year}.pdf`;

    return res.status(200).json({ pdf: base64Pdf, filename });
  } catch (err) {
    console.error("Content plan PDF export error:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
}

export default withSentry(handler);
