// /api/export-pdf.js
// Launches Puppeteer, navigates to the app in export mode, returns a PDF blob.

import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import { randomUUID } from "crypto";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const APP_URL = "https://loudmouth-calendar.vercel.app";

export default async function handler(req, res) {
  // Warm-up ping — returns immediately to keep function hot
  if (req.method === "HEAD") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { calendarId } = req.body;
  if (!calendarId) return res.status(400).json({ error: "Missing calendarId" });

  // 1. Fetch the calendar record
  const { data: cal, error: calErr } = await supabaseAdmin
    .from("calendars")
    .select("*")
    .eq("id", calendarId)
    .single();
  if (calErr || !cal) return res.status(404).json({ error: "Calendar not found" });

  // 2. Fetch the most recent draft snapshot
  const { data: draft, error: draftErr } = await supabaseAdmin
    .from("calendar_drafts")
    .select("*")
    .eq("calendar_id", calendarId)
    .order("saved_at", { ascending: false })
    .limit(1)
    .single();
  if (draftErr || !draft) return res.status(404).json({ error: "No draft found" });

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
  await redis.set(`export:${token}`, JSON.stringify(payload), { ex: 120 });

  // 4. Launch Puppeteer
  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    // Navigate to the app in export mode
    await page.goto(`${APP_URL}/?exportToken=${token}`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    // Wait for app to signal all images loaded + fonts settled
    await page.waitForFunction("window.__EXPORT_READY__ === true", {
      timeout: 22000,
      polling: 300,
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      printBackground: true,
      format: "A4",
      landscape: true,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${cal.client_name}-content-calendar.pdf"`
    );
    return res.status(200).send(pdfBuffer);

  } catch (err) {
    console.error("PDF export error:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
}