// api/billing/process-recurring.js
// Vercel Cron: daily at 10:00 UTC
// Finds recurring invoices due today or earlier, clones them into new invoices,
// auto-sends each new invoice via email, and advances next_invoice_date.
//
// Auth: CRON_SECRET header (matches existing pattern in the app).

import { createClient } from "@supabase/supabase-js";
import { freshBooksHeaders } from "./freshbooks.js";

// ── Supabase ──────────────────────────────────────────────────────────────────
function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Advance next_invoice_date by one recurrence period ────────────────────────
function advanceDate(dateStr, rule) {
  const d = new Date(dateStr);
  if (rule === "monthly")   d.setMonth(d.getMonth() + 1);
  if (rule === "quarterly") d.setMonth(d.getMonth() + 3);
  if (rule === "yearly")    d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}

// ── Calculate new due_date preserving the original payment window ─────────────
function calcDueDate(originalIssue, originalDue, newIssue) {
  const offsetDays = Math.round(
    (new Date(originalDue) - new Date(originalIssue)) / (1000 * 60 * 60 * 24)
  );
  const d = new Date(newIssue);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

// ── Mirror new invoice to FreshBooks ─────────────────────────────────────────
async function mirrorToFreshBooks(supabase, invoice, client, lineItems) {
  const accountId = process.env.FRESHBOOKS_ACCOUNT_ID;
  if (!accountId || !client.freshbooks_contact_id) return;

  try {
    const headers = await freshBooksHeaders();
    const fbLines = lineItems.map((item) => ({
      type: 0,
      description: item.description,
      name: item.description,
      qty: Number(item.quantity),
      unit_cost: { amount: String(Number(item.unit_price).toFixed(2)), code: invoice.currency },
    }));

    const offsetDays = Math.round(
      (new Date(invoice.due_date) - new Date(invoice.issue_date)) / (1000 * 60 * 60 * 24)
    );

    const fbRes = await fetch(
      `https://api.freshbooks.com/accounting/account/${accountId}/invoices/invoices`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          invoice: {
            customerid: client.freshbooks_contact_id,
            create_date: invoice.issue_date,
            due_offset_days: offsetDays,
            currency_code: invoice.currency,
            lines: fbLines,
            notes: invoice.notes || "",
          },
        }),
      }
    );

    if (fbRes.ok) {
      const fbData = await fbRes.json();
      const fbInvoice = fbData?.response?.result?.invoice;
      const freshbooksInvoiceId = String(fbInvoice?.id ?? "");
      if (freshbooksInvoiceId) {
        await supabase
          .from("invoices")
          .update({ freshbooks_invoice_id: freshbooksInvoiceId })
          .eq("id", invoice.id);
      }
    } else {
      console.error("[recurring] FreshBooks mirror failed:", await fbRes.text());
    }
  } catch (err) {
    console.error("[recurring] FreshBooks mirror error:", err.message);
  }
}

// ── Send invoice email (Resend) ───────────────────────────────────────────────
async function sendInvoiceEmail(invoice, client, lineItems) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !client?.email) return;

  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: invoice.currency ?? "USD",
  }).format(invoice.total);

  const formattedDue = new Date(invoice.due_date).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const lineItemsHtml = lineItems
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(item => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #222;color:#ccc;font-size:14px;">${item.description}</td>
        <td style="padding:10px 0;border-bottom:1px solid #222;color:#ccc;font-size:14px;text-align:center;">${Number(item.quantity)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #222;color:#ccc;font-size:14px;text-align:right;">$${Number(item.unit_price).toFixed(2)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #222;color:#ccc;font-size:14px;text-align:right;">$${Number(item.line_total).toFixed(2)}</td>
      </tr>`)
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border:1px solid #222;border-radius:4px;overflow:hidden;max-width:600px;">

        <tr><td style="background:#D7FA06;padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><span style="font-size:22px;font-weight:900;color:#000;letter-spacing:-0.5px;text-transform:uppercase;">LOUDMOUTH</span></td>
              <td align="right"><span style="font-size:13px;font-weight:700;color:#000;text-transform:uppercase;letter-spacing:1px;">Invoice</span></td>
            </tr>
          </table>
        </td></tr>

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
          <div style="color:#fff;font-size:16px;font-weight:600;margin-top:4px;">${client.name ?? ""}</div>
          ${client.company ? `<div style="color:#888;font-size:14px;">${client.company}</div>` : ""}
        </td></tr>

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
        <tr><td style="padding:20px 32px 0;">
          <div style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Notes</div>
          <div style="color:#888;font-size:13px;line-height:1.5;">${invoice.notes}</div>
        </td></tr>` : ""}

        ${invoice.payment_url ? `
        <tr><td style="padding:28px 32px;">
          <a href="${invoice.payment_url}" style="display:block;background:#D7FA06;color:#000;text-align:center;padding:16px 24px;font-size:16px;font-weight:900;text-decoration:none;text-transform:uppercase;letter-spacing:1px;border-radius:2px;">Pay Now →</a>
        </td></tr>` : `<tr><td style="padding:28px 32px;"></td></tr>`}

        <tr><td style="padding:0 32px 28px;border-top:1px solid #111;">
          <p style="color:#444;font-size:11px;margin:16px 0 0;line-height:1.5;">
            Questions? Reply to this email or contact us at billing@getloudmouth.work<br>
            <a href="mailto:billing@getloudmouth.work" style="color:#555;text-decoration:none;">Unsubscribe</a>
          </p>
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
      from: "Loudmouth <billing@getloudmouth.work>",
      to: [client.email],
      subject: `Invoice ${invoice.invoice_number} from Loudmouth Creative — ${formattedTotal}`,
      html,
      headers: { "List-Unsubscribe": "<mailto:billing@getloudmouth.work>" },
    }),
  });

  if (!emailRes.ok) {
    const body = await emailRes.text();
    console.error(`[recurring] Email failed for invoice ${invoice.invoice_number} (${emailRes.status}): ${body}`);
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth: CRON_SECRET header (set by Vercel cron, or passed manually for testing)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const incoming = req.headers.authorization?.replace("Bearer ", "");
    if (incoming !== cronSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const supabase = getSupabaseAdmin();
  const today = new Date().toISOString().split("T")[0];

  // ── Find due recurring invoices ───────────────────────────────────────────
  const { data: dueInvoices, error: queryError } = await supabase
    .from("invoices")
    .select(`
      *,
      clients ( id, name, email, phone, company, freshbooks_contact_id ),
      invoice_line_items ( * )
    `)
    .eq("is_recurring", true)
    .lte("next_invoice_date", today)
    .not("status", "eq", "cancelled");

  if (queryError) {
    console.error("[recurring] Query failed:", queryError.message);
    return res.status(500).json({ error: queryError.message });
  }

  if (!dueInvoices || dueInvoices.length === 0) {
    console.log("[recurring] No recurring invoices due today");
    return res.status(200).json({ ok: true, processed: 0 });
  }

  const results = [];

  for (const source of dueInvoices) {
    const client = source.clients;
    const lineItems = source.invoice_line_items ?? [];
    const newIssueDate = source.next_invoice_date;
    const newDueDate = calcDueDate(source.issue_date, source.due_date, newIssueDate);

    try {
      // 1. Generate new invoice number
      const { data: invoiceNumber, error: numError } = await supabase.rpc("next_invoice_number");
      if (numError) throw new Error(`Invoice number failed: ${numError.message}`);

      // 2. Calculate totals (line_total is a generated column — recompute from source)
      const subtotal = lineItems.reduce((sum, item) => {
        return sum + Number(item.quantity) * Number(item.unit_price);
      }, 0);
      const taxAmount = parseFloat(((subtotal * Number(source.tax_rate)) / 100).toFixed(2));
      const total = parseFloat((subtotal + taxAmount).toFixed(2));

      // 3. Next recurrence date after this one
      const nextAfterThis = advanceDate(newIssueDate, source.recurrence_rule);

      // 4. Insert new invoice
      const { data: newInvoice, error: insertError } = await supabase
        .from("invoices")
        .insert({
          client_id: source.client_id,
          created_by: source.created_by,
          invoice_number: invoiceNumber,
          issue_date: newIssueDate,
          due_date: newDueDate,
          subtotal: parseFloat(subtotal.toFixed(2)),
          tax_rate: Number(source.tax_rate),
          tax_amount: taxAmount,
          total,
          currency: source.currency,
          notes: source.notes,
          is_recurring: source.is_recurring,
          recurrence_rule: source.recurrence_rule,
          next_invoice_date: nextAfterThis,
          status: "draft",
        })
        .select()
        .single();

      if (insertError) throw new Error(`Invoice insert failed: ${insertError.message}`);

      // 5. Clone line items
      const newLineItems = lineItems.map((item, i) => ({
        invoice_id: newInvoice.id,
        service_catalog_id: item.service_catalog_id ?? null,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        sort_order: item.sort_order ?? i,
      }));

      const { error: lineError } = await supabase
        .from("invoice_line_items")
        .insert(newLineItems);

      if (lineError) {
        // Roll back orphan invoice
        await supabase.from("invoices").delete().eq("id", newInvoice.id);
        throw new Error(`Line items failed: ${lineError.message}`);
      }

      // 6. Log created event on new invoice
      await supabase.from("invoice_events").insert({
        invoice_id: newInvoice.id,
        event_type: "created",
        actor: "system",
        metadata: { source: "recurring_cron", parent_invoice_id: source.id },
      });

      // 7. Mirror to FreshBooks (non-fatal)
      await mirrorToFreshBooks(supabase, newInvoice, client, newLineItems);

      // 8. Auto-send via email (non-fatal)
      try {
        await sendInvoiceEmail(newInvoice, client, newLineItems);

        await supabase
          .from("invoices")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", newInvoice.id);

        await supabase.from("invoice_events").insert({
          invoice_id: newInvoice.id,
          event_type: "sent",
          actor: "system",
          metadata: { method: "email", source: "recurring_cron" },
        });
      } catch (sendErr) {
        console.error(`[recurring] Email failed for new invoice ${invoiceNumber}:`, sendErr.message);
      }

      // 9. Advance next_invoice_date on the source invoice
      await supabase
        .from("invoices")
        .update({ next_invoice_date: nextAfterThis })
        .eq("id", source.id);

      // 10. Log on source invoice
      await supabase.from("invoice_events").insert({
        invoice_id: source.id,
        event_type: "updated",
        actor: "system",
        metadata: {
          source: "recurring_cron",
          new_invoice_id: newInvoice.id,
          new_invoice_number: invoiceNumber,
          next_invoice_date: nextAfterThis,
        },
      });

      console.log(`[recurring] Created ${invoiceNumber} from recurring invoice ${source.invoice_number}`);
      results.push({ source: source.invoice_number, created: invoiceNumber, status: "ok" });

    } catch (err) {
      console.error(`[recurring] Failed to process ${source.invoice_number}:`, err.message);
      results.push({ source: source.invoice_number, status: "error", error: err.message });
    }
  }

  const succeeded = results.filter(r => r.status === "ok").length;
  const failed = results.filter(r => r.status === "error").length;

  console.log(`[recurring] Done — ${succeeded} created, ${failed} failed`);
  return res.status(200).json({ ok: true, processed: results.length, succeeded, failed, results });
}
