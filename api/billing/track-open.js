// api/billing/track-open.js
// GET /api/billing/track-open/[invoiceId]
//
// Open tracking pixel for invoice emails.
// Returns a 1×1 transparent GIF — no auth required (called by email clients).
// If the invoice status is 'sent', updates it to 'viewed' and logs the event.
//
// Note: iOS Mail blocks tracking pixels by default. 'viewed' is best-effort only.

import { createClient } from "@supabase/supabase-js";

// 1×1 transparent GIF (smallest valid GIF — 35 bytes)
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(req, res) {
  // Always return the pixel — tracking is best-effort and must not error visibly
  const sendPixel = () => {
    res.setHeader("Content-Type", "image/gif");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.status(200).end(PIXEL);
  };

  const invoiceId = req.query.invoiceId;
  if (!invoiceId) return sendPixel();

  try {
    const supabase = getSupabaseAdmin();

    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, status")
      .eq("id", invoiceId)
      .single();

    if (invoice && invoice.status === "sent") {
      // Promote to 'viewed'
      await supabase
        .from("invoices")
        .update({ status: "viewed" })
        .eq("id", invoiceId);

      await supabase.from("invoice_events").insert({
        invoice_id: invoiceId,
        event_type: "viewed",
        actor: "client",
        metadata: {
          user_agent: req.headers["user-agent"] ?? null,
        },
      });
    }
  } catch (err) {
    // Non-fatal — pixel is returned regardless
    console.error("[track-open] Error:", err.message);
  }

  sendPixel();
}
