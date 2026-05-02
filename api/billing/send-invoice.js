// api/billing/send-invoice.js
// POST /api/billing/send-invoice
// Body: { invoiceId, method: 'email' | 'sms' | 'both' }
// Sends an invoice via email (with PDF) and/or SMS, then updates status to 'sent'.

import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import { randomUUID } from "crypto";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import twilio from "twilio";
import { withSentry } from '../_sentry.js';

// ── Supabase ──────────────────────────────────────────────────────────────────
function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Redis ─────────────────────────────────────────────────────────────────────
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

// ── App URL ───────────────────────────────────────────────────────────────────
function resolveAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:5173";
}

// ── Puppeteer ─────────────────────────────────────────────────────────────────
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
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return puppeteer.launch({
    args: [
      ...chromium.args.filter(arg => arg !== "--no-zygote"),
      "--font-render-hinting=none",
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

// ── PDF generation ────────────────────────────────────────────────────────────
async function generateInvoicePdf(invoice, appUrl) {
  const redis = getRedis();
  const token = randomUUID();

  // Store invoice payload in Redis for headless browser to fetch
  await redis.set(
    `billinvoice:${token}`,
    JSON.stringify({
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      status: invoice.status,
      subtotal: invoice.subtotal,
      taxRate: invoice.tax_rate,
      taxAmount: invoice.tax_amount,
      total: invoice.total,
      currency: invoice.currency,
      notes: invoice.notes,
      paymentUrl: invoice.payment_url,
      client: invoice.clients,
      lineItems: invoice.invoice_line_items,
    }),
    { ex: 120 }
  );

  let browser = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 1 });

    page.on("console", msg => console.log(`[billing-pdf:${msg.type()}]`, msg.text()));
    page.on("pageerror", err => console.error("[billing-pdf:pageerror]", err.message));

    await page.goto(`${appUrl}/?billingExportToken=${token}`, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    });

    await page.waitForFunction(
      "window.__BILLING_EXPORT_READY__ === true || window.__BILLING_EXPORT_ERROR__ === true",
      { timeout: 12000, polling: 200 }
    );

    const exportError = await page.evaluate(() => !!window.__BILLING_EXPORT_ERROR__);
    if (exportError) throw new Error("Invoice data failed to load in headless browser");

    await page.evaluate(async () => {
      try { if (document.fonts?.ready) await document.fonts.ready; } catch { /* ignore */ }
    });
    await page.emulateMediaType("print");
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

    const { pageWidth, pageHeight } = await page.evaluate(() => {
      const el = document.querySelector(".invoice-page");
      if (!el) return { pageWidth: 794, pageHeight: 1123 }; // A4 at 96dpi
      const r = el.getBoundingClientRect();
      return { pageWidth: Math.round(r.width), pageHeight: Math.round(r.height) };
    });

    const pdfBuffer = await page.pdf({
      width: `${pageWidth}px`,
      height: `${pageHeight}px`,
      printBackground: true,
      preferCSSPageSize: false,
    });

    return Buffer.from(pdfBuffer).toString("base64");
  } finally {
    if (browser) await browser.close();
  }
}

// ── Email (Resend) ────────────────────────────────────────────────────────────
async function sendEmail(invoice, pdfBase64, appUrl) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");

  const client = invoice.clients;
  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: invoice.currency ?? "USD",
  }).format(invoice.total);
  const formattedDue = new Date(invoice.due_date).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const lineItemsHtml = (invoice.invoice_line_items ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(item => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #222;color:#ccc;font-size:14px;">${item.description}</td>
        <td style="padding:10px 0;border-bottom:1px solid #222;color:#ccc;font-size:14px;text-align:center;">${Number(item.quantity)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #222;color:#ccc;font-size:14px;text-align:right;">$${Number(item.unit_price).toFixed(2)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #222;color:#ccc;font-size:14px;text-align:right;">$${Number(item.line_total).toFixed(2)}</td>
      </tr>`)
    .join("");

  const trackingPixel = `${appUrl}/api/billing/track-open/${invoice.id}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border:1px solid #222;border-radius:4px;overflow:hidden;max-width:600px;">

        <!-- Header -->
        <tr><td style="background:#D7FA06;padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><span style="font-size:22px;font-weight:900;color:#000;letter-spacing:-0.5px;text-transform:uppercase;">LOUDMOUTH</span></td>
              <td align="right"><span style="font-size:13px;font-weight:700;color:#000;text-transform:uppercase;letter-spacing:1px;">Invoice</span></td>
            </tr>
          </table>
        </td></tr>

        <!-- Invoice meta -->
        <tr><td style="padding:28px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Invoice #</td>
              <td align="right" style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Due Date</td>
            </tr>
            <tr>
              <td style="color:#fff;font-size:20px;font-weight:700;padding-top:4px;">${invoice.invoice_number}</td>
              <td align="right" style="color:#E8001C;font-size:16px;font-weight:700;padding-top:4px;">${formattedDue}</td>
            </tr>
          </table>
          <div style="margin-top:20px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Bill To</div>
          <div style="color:#fff;font-size:16px;font-weight:600;margin-top:4px;">${client?.name ?? ""}</div>
          ${client?.company ? `<div style="color:#888;font-size:14px;">${client.company}</div>` : ""}
        </td></tr>

        <!-- Line items -->
        <tr><td style="padding:24px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <th style="text-align:left;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;border-bottom:1px solid #333;">Description</th>
              <th style="text-align:center;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;border-bottom:1px solid #333;">Qty</th>
              <th style="text-align:right;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;border-bottom:1px solid #333;">Rate</th>
              <th style="text-align:right;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;border-bottom:1px solid #333;">Total</th>
            </tr>
            ${lineItemsHtml}
          </table>
        </td></tr>

        <!-- Totals -->
        <tr><td style="padding:16px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #222;">
            ${invoice.tax_rate > 0 ? `
            <tr>
              <td colspan="3" style="padding-top:12px;color:#888;font-size:13px;">Subtotal</td>
              <td style="padding-top:12px;color:#ccc;font-size:13px;text-align:right;">$${Number(invoice.subtotal).toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding-top:8px;color:#888;font-size:13px;">Tax (${invoice.tax_rate}%)</td>
              <td style="padding-top:8px;color:#ccc;font-size:13px;text-align:right;">$${Number(invoice.tax_amount).toFixed(2)}</td>
            </tr>` : ""}
            <tr>
              <td colspan="3" style="padding-top:16px;color:#fff;font-size:18px;font-weight:700;">Total Due</td>
              <td style="padding-top:16px;color:#D7FA06;font-size:22px;font-weight:900;text-align:right;">${formattedTotal}</td>
            </tr>
          </table>
        </td></tr>

        ${invoice.notes ? `
        <!-- Notes -->
        <tr><td style="padding:20px 32px 0;">
          <div style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Notes</div>
          <div style="color:#888;font-size:13px;line-height:1.5;">${invoice.notes}</div>
        </td></tr>` : ""}

        <!-- CTA -->
        ${invoice.payment_url ? `
        <tr><td style="padding:28px 32px;">
          <a href="${invoice.payment_url}" style="display:block;background:#D7FA06;color:#000;text-align:center;padding:16px 24px;font-size:16px;font-weight:900;text-decoration:none;text-transform:uppercase;letter-spacing:1px;border-radius:2px;">Pay Now →</a>
        </td></tr>` : `<tr><td style="padding:28px 32px;"></td></tr>`}

        <!-- Footer -->
        <tr><td style="padding:0 32px 28px;border-top:1px solid #111;">
          <p style="color:#444;font-size:11px;margin:16px 0 0;line-height:1.5;">
            Questions? Reply to this email or contact us at billing@getloudmouth.work<br>
            <a href="mailto:billing@getloudmouth.work" style="color:#555;text-decoration:none;">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
  <img src="${trackingPixel}" width="1" height="1" style="display:none" alt="">
</body>
</html>`;

  const attachments = pdfBase64
    ? [{ filename: `invoice-${invoice.invoice_number}.pdf`, content: pdfBase64 }]
    : [];

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Loudmouth <billing@getloudmouth.work>",
      to: [client.email],
      subject: `Invoice ${invoice.invoice_number} from Loudmouth Creative — ${formattedTotal}`,
      html,
      attachments,
      headers: { "List-Unsubscribe": "<mailto:billing@getloudmouth.work>" },
    }),
  });

  if (!emailRes.ok) {
    const body = await emailRes.text();
    throw new Error(`Resend failed (${emailRes.status}): ${body}`);
  }
}

// Normalize phone to E.164 (+1XXXXXXXXXX) if it looks like a US number.
// Older client rows pre-date the normalization in api/billing/clients.js.
function normalizePhone(raw) {
  if (!raw) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw;
}

// ── SMS (Twilio) ──────────────────────────────────────────────────────────────
async function sendSms(invoice) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Missing Twilio env vars (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)");
  }

  const client = invoice.clients;
  if (!client?.phone) {
    throw new Error("Client has no phone number on file");
  }
  const toNumber = normalizePhone(client.phone);
  if (!/^\+\d{10,15}$/.test(toNumber)) {
    throw new Error(`Phone "${client.phone}" is not in E.164 format (expected +1XXXXXXXXXX)`);
  }

  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: invoice.currency ?? "USD",
  }).format(invoice.total);

  const formattedDue = new Date(invoice.due_date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  const paymentLine = invoice.payment_url
    ? `\nPay now: ${invoice.payment_url}`
    : "";

  const body =
    `Loudmouth Creative\nInvoice ${invoice.invoice_number}: ${formattedTotal} due ${formattedDue}.${paymentLine}\n\nReply STOP to opt out.`;

  const twilioClient = twilio(accountSid, authToken);
  await twilioClient.messages.create({
    to: toNumber,
    from: fromNumber,
    body,
  });
}

// ── Handler ───────────────────────────────────────────────────────────────────
async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  const { invoiceId, method } = req.body ?? {};
  if (!invoiceId) return res.status(400).json({ error: "invoiceId is required" });
  if (!["email", "sms", "both"].includes(method)) {
    return res.status(400).json({ error: "method must be 'email', 'sms', or 'both'" });
  }

  const supabase = getSupabaseAdmin();

  // Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "account_manager"].includes(profile.role) || profile.status !== "active") {
    return res.status(403).json({ error: "Billing access required" });
  }

  // Fetch full invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(`*, clients ( id, name, email, phone, company ), invoice_line_items ( * )`)
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) return res.status(404).json({ error: "Invoice not found" });
  if (invoice.status === "paid") return res.status(400).json({ error: "Invoice is already paid" });
  if (invoice.status === "cancelled") return res.status(400).json({ error: "Invoice is cancelled" });

  // Validate delivery prerequisites
  if ((method === "email" || method === "both") && !invoice.clients?.email) {
    return res.status(400).json({ error: "Client has no email address on file" });
  }
  if ((method === "sms" || method === "both") && !invoice.clients?.phone) {
    return res.status(400).json({ error: "Client has no phone number on file" });
  }

  const appUrl = resolveAppUrl();
  const errors = [];

  // ── Email ────────────────────────────────────────────────────────────────
  if (method === "email" || method === "both") {
    let pdfBase64 = null;
    try {
      pdfBase64 = await generateInvoicePdf(invoice, appUrl);
    } catch (pdfErr) {
      // PDF is best-effort — send email without attachment if generation fails
      console.error("PDF generation failed, sending without attachment:", pdfErr.message);
    }

    try {
      await sendEmail(invoice, pdfBase64, appUrl);
    } catch (emailErr) {
      console.error("[send-invoice] email failed:", emailErr);
      errors.push(`Email failed: ${emailErr.message}`);
    }
  }

  // ── SMS ──────────────────────────────────────────────────────────────────
  if (method === "sms" || method === "both") {
    try {
      await sendSms(invoice);
    } catch (smsErr) {
      console.error("[send-invoice] sms failed:", smsErr);
      errors.push(`SMS failed: ${smsErr.message}`);
    }
  }

  // If both methods failed, return error
  if (errors.length > 0 && (method === "both" ? errors.length === 2 : errors.length === 1)) {
    return res.status(500).json({ error: errors.join("; ") });
  }

  // Mark as sent
  await supabase
    .from("invoices")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", invoiceId);

  await supabase.from("invoice_events").insert({
    invoice_id: invoiceId,
    event_type: "sent",
    actor: profile.role,
    metadata: { method, partial_errors: errors.length > 0 ? errors : undefined },
  });

  return res.status(200).json({
    ok: true,
    method,
    warnings: errors.length > 0 ? errors : undefined,
  });
}

export default withSentry(handler);
