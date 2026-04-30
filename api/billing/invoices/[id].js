// api/billing/invoices/[id].js
// GET   /api/billing/invoices/:id  — fetch invoice detail with line items + events
// PATCH /api/billing/invoices/:id  — update invoice fields (status, notes, dates, etc.)

import { createClient } from "@supabase/supabase-js";
import { withSentry } from '../../_sentry.js';

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Fields callers are allowed to PATCH directly
const PATCHABLE_FIELDS = new Set([
  "status",
  "notes",
  "issue_date",
  "due_date",
  "tax_rate",
  "is_recurring",
  "recurrence_rule",
  "next_invoice_date",
]);

async function handler(req, res) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  const invoiceId = req.query.id;
  if (!invoiceId) return res.status(400).json({ error: "Missing invoice id" });

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

  // ── GET — invoice detail ──────────────────────────────────────────────────
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("invoices")
      .select(`
        *,
        clients ( id, name, email, phone, company ),
        invoice_line_items ( * ),
        invoice_events ( * )
      `)
      .eq("id", invoiceId)
      .order("sort_order", { referencedTable: "invoice_line_items" })
      .order("created_at", { referencedTable: "invoice_events", ascending: false })
      .single();

    if (error) return res.status(404).json({ error: "Invoice not found" });
    return res.status(200).json(data);
  }

  // ── PATCH — update invoice ────────────────────────────────────────────────
  if (req.method === "PATCH") {
    const body = req.body ?? {};

    // Only allow known fields
    const updates = {};
    for (const [key, val] of Object.entries(body)) {
      if (PATCHABLE_FIELDS.has(key)) updates[key] = val;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No patchable fields provided" });
    }

    // Validate status value if being changed
    const VALID_STATUSES = ["draft", "sent", "viewed", "paid", "overdue", "cancelled"];
    if (updates.status && !VALID_STATUSES.includes(updates.status)) {
      return res.status(400).json({ error: `Invalid status: ${updates.status}` });
    }

    // Auto-set paid_at when marking paid
    if (updates.status === "paid") updates.paid_at = new Date().toISOString();
    if (updates.status === "sent") updates.sent_at = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from("invoices")
      .update(updates)
      .eq("id", invoiceId)
      .select()
      .single();

    if (updateError) return res.status(500).json({ error: updateError.message });

    // Log the update event
    await supabase.from("invoice_events").insert({
      invoice_id: invoiceId,
      event_type: updates.status ?? "updated",
      actor: profile.role,
      metadata: { changes: updates },
    });

    return res.status(200).json(updated);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withSentry(handler);
