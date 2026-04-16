// api/billing/webhooks/freshbooks.js
// POST /api/billing/webhooks/freshbooks
//
// Receives FreshBooks webhook events and syncs payment status back to Supabase.
// Currently handles: payment.create
//
// Verification:
//   FreshBooks sends a `verifier` field = HMAC-SHA256(FRESHBOOKS_WEBHOOK_SECRET, object_id)
//   We recompute and compare before trusting any payload.
//
// Required env var:
//   FRESHBOOKS_WEBHOOK_SECRET  — set when registering the webhook in FreshBooks

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { freshBooksHeaders } from "../freshbooks.js";

// ── Supabase (service role — bypasses RLS for webhook writes) ─────────────────
function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Signature verification ────────────────────────────────────────────────────
// FreshBooks: HMAC-SHA256(FRESHBOOKS_WEBHOOK_SECRET, object_id) → hex
function verifySignature(secret, objectId, receivedVerifier) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(String(objectId))
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(receivedVerifier, "hex")
    );
  } catch {
    return false;
  }
}

// ── Fetch payment details from FreshBooks ─────────────────────────────────────
async function fetchPayment(accountId, paymentId) {
  const headers = await freshBooksHeaders();
  const res = await fetch(
    `https://api.freshbooks.com/accounting/account/${accountId}/payments/payments/${paymentId}`,
    { headers }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FreshBooks payment fetch failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data?.response?.result?.payment ?? null;
}

// ── Payment confirmation email (Resend) ───────────────────────────────────────
async function sendPaymentConfirmation(invoice) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[fb-webhook] No RESEND_API_KEY — skipping confirmation email");
    return;
  }

  const client = invoice.clients;
  if (!client?.email) return; // No email on file — skip silently

  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: invoice.currency ?? "USD",
  }).format(invoice.total);

  const formattedDate = new Date(invoice.paid_at).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

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
              <td align="right"><span style="font-size:13px;font-weight:700;color:#000;text-transform:uppercase;letter-spacing:1px;">Payment Received</span></td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 32px;">
          <p style="color:#888;font-size:14px;margin:0 0 8px;">Hi ${client.name ?? "there"},</p>
          <p style="color:#fff;font-size:16px;line-height:1.6;margin:0 0 28px;">
            We've received your payment of <strong style="color:#D7FA06;">${formattedTotal}</strong> for invoice <strong style="color:#fff;">${invoice.invoice_number}</strong>. Thank you!
          </p>

          <!-- Receipt block -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:4px;margin-bottom:28px;">
            <tr>
              <td style="padding:16px 20px;border-bottom:1px solid #1a1a1a;">
                <span style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px;">Invoice</span>
                <span style="color:#fff;font-size:15px;font-weight:700;">${invoice.invoice_number}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px;border-bottom:1px solid #1a1a1a;">
                <span style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px;">Amount Paid</span>
                <span style="color:#D7FA06;font-size:20px;font-weight:900;">${formattedTotal}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px;">
                <span style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px;">Payment Date</span>
                <span style="color:#fff;font-size:15px;">${formattedDate}</span>
              </td>
            </tr>
          </table>

          <p style="color:#555;font-size:13px;line-height:1.6;margin:0;">
            Questions? Reply to this email or reach us at <a href="mailto:billing@getloudmouth.us" style="color:#888;text-decoration:none;">billing@getloudmouth.us</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:0 32px 28px;border-top:1px solid #111;">
          <p style="color:#333;font-size:11px;margin:16px 0 0;">Loudmouth Creative — billing@getloudmouth.us</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Loudmouth <billing@getloudmouth.us>",
      to: [client.email],
      subject: `Payment received — Invoice ${invoice.invoice_number} (${formattedTotal})`,
      html,
    }),
  });

  if (!emailRes.ok) {
    const body = await emailRes.text();
    console.error(`[fb-webhook] Confirmation email failed (${emailRes.status}): ${body}`);
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const webhookSecret = process.env.FRESHBOOKS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[fb-webhook] Missing FRESHBOOKS_WEBHOOK_SECRET");
    return res.status(500).json({ error: "Webhook not configured" });
  }

  const { name, object_id, account_id, verifier } = req.body ?? {};

  // ── Verify signature ──────────────────────────────────────────────────────
  if (!verifier || !object_id) {
    return res.status(400).json({ error: "Missing verifier or object_id" });
  }

  if (!verifySignature(webhookSecret, object_id, verifier)) {
    console.warn("[fb-webhook] Signature mismatch — rejecting payload");
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  // ── Only handle payment.create ────────────────────────────────────────────
  // FreshBooks sends a test event on webhook registration — log and ack.
  if (name !== "payment.create") {
    console.log(`[fb-webhook] Ignoring event: ${name}`);
    return res.status(200).json({ ok: true, ignored: true });
  }

  const accountId = account_id || process.env.FRESHBOOKS_ACCOUNT_ID;
  if (!accountId) {
    return res.status(500).json({ error: "Missing FRESHBOOKS_ACCOUNT_ID" });
  }

  // ── Fetch full payment from FreshBooks API ────────────────────────────────
  let payment;
  try {
    payment = await fetchPayment(accountId, object_id);
  } catch (err) {
    console.error("[fb-webhook] Failed to fetch payment:", err.message);
    return res.status(502).json({ error: `FreshBooks API error: ${err.message}` });
  }

  if (!payment) {
    return res.status(404).json({ error: "Payment not found in FreshBooks" });
  }

  const freshbooksInvoiceId = String(payment.invoiceid ?? "");
  if (!freshbooksInvoiceId) {
    console.warn("[fb-webhook] Payment has no invoiceid — cannot match", payment);
    return res.status(200).json({ ok: true, ignored: true, reason: "no invoiceid on payment" });
  }

  // ── Find matching invoice in Supabase ─────────────────────────────────────
  const supabase = getSupabaseAdmin();

  const { data: invoice, error: findError } = await supabase
    .from("invoices")
    .select("id, status, invoice_number, total, currency, clients ( id, name, email )")
    .eq("freshbooks_invoice_id", freshbooksInvoiceId)
    .single();

  if (findError || !invoice) {
    console.warn(`[fb-webhook] No invoice found for freshbooks_invoice_id=${freshbooksInvoiceId}`);
    return res.status(200).json({ ok: true, ignored: true, reason: "invoice not tracked locally" });
  }

  // Already paid — idempotent ack
  if (invoice.status === "paid") {
    console.log(`[fb-webhook] Invoice ${invoice.invoice_number} already paid — no-op`);
    return res.status(200).json({ ok: true, idempotent: true });
  }

  // ── Mark invoice as paid ──────────────────────────────────────────────────
  const paidAt = payment.date
    ? new Date(payment.date).toISOString()
    : new Date().toISOString();

  const { error: updateError } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: paidAt })
    .eq("id", invoice.id);

  if (updateError) {
    console.error("[fb-webhook] Supabase update failed:", updateError.message);
    return res.status(500).json({ error: updateError.message });
  }

  // ── Log payment event ─────────────────────────────────────────────────────
  await supabase.from("invoice_events").insert({
    invoice_id: invoice.id,
    event_type: "paid",
    actor: "freshbooks_webhook",
    metadata: {
      freshbooks_payment_id: String(object_id),
      freshbooks_invoice_id: freshbooksInvoiceId,
      amount: payment.amount?.amount,
      currency: payment.amount?.code,
      payment_type: payment.type,
      payment_date: payment.date,
    },
  });

  // ── Send branded payment confirmation email ───────────────────────────────
  try {
    await sendPaymentConfirmation({ ...invoice, paid_at: paidAt });
  } catch (emailErr) {
    // Non-fatal — invoice is already marked paid; just log
    console.error("[fb-webhook] Confirmation email error:", emailErr.message);
  }

  console.log(`[fb-webhook] Invoice ${invoice.invoice_number} marked paid via FreshBooks payment ${object_id}`);
  return res.status(200).json({ ok: true, invoiceId: invoice.id });
}
