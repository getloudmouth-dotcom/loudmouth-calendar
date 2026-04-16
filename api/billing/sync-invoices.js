// api/billing/sync-invoices.js
// POST /api/billing/sync-invoices — pull all invoices from FreshBooks, upsert into Supabase.
// Last-write wins: if FreshBooks record is newer → update local.
//                  if local record is newer → skip (no push; invoices are auth'd in FB).

import { createClient } from "@supabase/supabase-js";
import { freshBooksHeaders } from "./freshbooks.js";

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

// FreshBooks status int → local status string
function mapStatus(fbStatus) {
  switch (fbStatus) {
    case 1: return "draft";
    case 2: return "sent";
    case 4: return "viewed";
    case 5: return "paid";
    default: return "draft";
  }
}

// due_date can be a string "YYYY-MM-DD" or an object { date: "YYYY-MM-DD" }
function parseDueDate(raw) {
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw.date) return raw.date;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  const supabase = getSupabaseAdmin();

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

  const accountId = process.env.FRESHBOOKS_ACCOUNT_ID;
  if (!accountId) return res.status(500).json({ error: "FRESHBOOKS_ACCOUNT_ID not configured" });

  // ── Fetch all FreshBooks invoices (paginated) ─────────────────────────────
  let allFbInvoices = [];
  let page = 1;

  try {
    while (true) {
      const headers = await freshBooksHeaders();
      const fbRes = await fetch(
        `https://api.freshbooks.com/accounting/account/${accountId}/invoices/invoices?page=${page}&per_page=100`,
        { headers }
      );
      if (!fbRes.ok) {
        const body = await fbRes.text();
        return res.status(502).json({ error: `FreshBooks fetch failed (${fbRes.status}): ${body}` });
      }
      const data = await fbRes.json();
      const result = data?.response?.result;
      const batch = result?.invoices ?? [];
      allFbInvoices.push(...batch);
      if (page >= (result?.pages?.pages ?? 1)) break;
      page++;
    }
  } catch (err) {
    return res.status(502).json({ error: `FreshBooks error: ${err.message}` });
  }

  // ── Load local data ───────────────────────────────────────────────────────
  // Index local invoices by freshbooks_invoice_id
  const { data: localInvoices, error: invErr } = await supabase
    .from("invoices")
    .select("id, freshbooks_invoice_id, status, updated_at")
    .not("freshbooks_invoice_id", "is", null);
  if (invErr) return res.status(500).json({ error: invErr.message });

  const byFbInvoiceId = Object.fromEntries(
    (localInvoices ?? []).map(inv => [inv.freshbooks_invoice_id, inv])
  );

  // Index local clients by freshbooks_contact_id (to resolve customerid → client_id)
  const { data: localClients, error: clientErr } = await supabase
    .from("clients")
    .select("id, freshbooks_contact_id")
    .not("freshbooks_contact_id", "is", null);
  if (clientErr) return res.status(500).json({ error: clientErr.message });

  const clientByFbId = Object.fromEntries(
    (localClients ?? []).map(c => [String(c.freshbooks_contact_id), c])
  );

  let created = 0, updated = 0, skipped = 0;
  const errors = [];

  for (const fb of allFbInvoices) {
    const fbInvoiceId = String(fb.id);
    // FreshBooks timestamps are UTC but have no timezone suffix
    const fbUpdated = new Date(`${fb.updated} UTC`);
    const status = mapStatus(fb.status);
    const dueDate = parseDueDate(fb.due_date);
    const total = parseFloat(parseFloat(fb.amount?.amount ?? 0).toFixed(2));
    const notes = fb.notes?.trim() || null;
    const currency = fb.currency_code || "USD";
    const invoiceNumber = fb.invoice_number || fbInvoiceId;

    const local = byFbInvoiceId[fbInvoiceId];

    if (!local) {
      // ── New invoice from FreshBooks — insert locally ──────────────────────
      const client = clientByFbId[String(fb.customerid)];
      if (!client) {
        // No matching local client — skip (run sync-clients first)
        errors.push({ fbInvoiceId, invoiceNumber, error: `No local client for customerid ${fb.customerid}` });
        continue;
      }

      const { error: insertErr } = await supabase.from("invoices").insert({
        freshbooks_invoice_id: fbInvoiceId,
        client_id: client.id,
        created_by: user.id,
        invoice_number: invoiceNumber,
        issue_date: fb.create_date || null,
        due_date: dueDate,
        subtotal: total,  // no breakdown available from FB header
        tax_rate: 0,
        tax_amount: 0,
        total,
        currency,
        notes,
        status,
        payment_url: `https://my.freshbooks.com/#/invoice/${fbInvoiceId}`,
      });

      if (insertErr) {
        errors.push({ fbInvoiceId, invoiceNumber, error: insertErr.message });
        continue;
      }
      created++;
      continue;
    }

    // ── Existing invoice — last-write wins ────────────────────────────────
    const localUpdatedAt = new Date(local.updated_at ?? 0);

    if (fbUpdated > localUpdatedAt) {
      // FreshBooks is newer — update status, total, notes, due_date
      const { error: updateErr } = await supabase
        .from("invoices")
        .update({
          status,
          total,
          notes,
          due_date: dueDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", local.id);

      if (updateErr) {
        errors.push({ fbInvoiceId, invoiceNumber, error: updateErr.message });
        continue;
      }
      updated++;
    } else {
      // Local is newer — skip
      skipped++;
    }
  }

  return res.status(200).json({ created, updated, skipped, total: allFbInvoices.length, errors });
}
