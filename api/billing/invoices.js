// api/billing/invoices.js
// GET  /api/billing/invoices        — list invoices (with client name)
// POST /api/billing/invoices        — create invoice in Supabase + mirror to FreshBooks

import { createClient } from "@supabase/supabase-js";
import { freshBooksHeaders } from "./freshbooks.js";

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function requireBillingAccess(supabase, token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "account_manager"].includes(profile.role) || profile.status !== "active") {
    return null;
  }

  return user;
}

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  const supabase = getSupabaseAdmin();
  const user = await requireBillingAccess(supabase, token);
  if (!user) return res.status(403).json({ error: "Billing access required" });

  // ── GET — list invoices ───────────────────────────────────────────────────
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("invoices")
      .select(`
        *,
        clients ( id, name, email, phone, company )
      `)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // ── POST — create invoice ─────────────────────────────────────────────────
  if (req.method === "POST") {
    const {
      client_id,
      issue_date,
      due_date,
      line_items,       // [{ description, quantity, unit_price, service_catalog_id?, sort_order? }]
      notes,
      tax_rate = 0,
      currency = "USD",
      is_recurring = false,
      recurrence_rule = null,
    } = req.body ?? {};

    // Validate required fields
    if (!client_id) return res.status(400).json({ error: "client_id is required" });
    if (!issue_date) return res.status(400).json({ error: "issue_date is required" });
    if (!due_date) return res.status(400).json({ error: "due_date is required" });
    if (!Array.isArray(line_items) || line_items.length === 0) {
      return res.status(400).json({ error: "At least one line item is required" });
    }

    // Validate line items
    for (const item of line_items) {
      if (!item.description?.trim()) return res.status(400).json({ error: "Each line item needs a description" });
      if (!item.unit_price || isNaN(Number(item.unit_price))) return res.status(400).json({ error: "Each line item needs a valid unit_price" });
    }

    // Fetch client (need freshbooks_contact_id for FreshBooks mirror)
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, freshbooks_contact_id")
      .eq("id", client_id)
      .single();

    if (clientError || !client) return res.status(400).json({ error: "Client not found" });

    // Calculate totals
    const subtotal = line_items.reduce((sum, item) => {
      return sum + Number(item.quantity ?? 1) * Number(item.unit_price);
    }, 0);
    const taxAmount = parseFloat(((subtotal * Number(tax_rate)) / 100).toFixed(2));
    const total = parseFloat((subtotal + taxAmount).toFixed(2));

    // Generate invoice number via DB function
    const { data: numRow, error: numError } = await supabase
      .rpc("next_invoice_number");
    if (numError) return res.status(500).json({ error: "Failed to generate invoice number" });
    const invoiceNumber = numRow;

    // next_invoice_date for recurring invoices
    let nextInvoiceDate = null;
    if (is_recurring && recurrence_rule) {
      const base = new Date(issue_date);
      if (recurrence_rule === "monthly") base.setMonth(base.getMonth() + 1);
      else if (recurrence_rule === "quarterly") base.setMonth(base.getMonth() + 3);
      else if (recurrence_rule === "yearly") base.setFullYear(base.getFullYear() + 1);
      nextInvoiceDate = base.toISOString().split("T")[0];
    }

    // 1. Insert invoice into Supabase
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        client_id,
        created_by: user.id,
        invoice_number: invoiceNumber,
        issue_date,
        due_date,
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax_rate: Number(tax_rate),
        tax_amount: taxAmount,
        total,
        currency,
        notes: notes?.trim() || null,
        is_recurring,
        recurrence_rule: is_recurring ? recurrence_rule : null,
        next_invoice_date: nextInvoiceDate,
        status: "draft",
      })
      .select()
      .single();

    if (invoiceError) return res.status(500).json({ error: invoiceError.message });

    // 2. Insert line items
    const lineItemRows = line_items.map((item, i) => ({
      invoice_id: invoice.id,
      service_catalog_id: item.service_catalog_id ?? null,
      description: item.description.trim(),
      quantity: Number(item.quantity ?? 1),
      unit_price: Number(item.unit_price),
      sort_order: item.sort_order ?? i,
    }));

    const { error: lineError } = await supabase
      .from("invoice_line_items")
      .insert(lineItemRows);

    if (lineError) {
      // Roll back the invoice row so we don't have an orphan
      await supabase.from("invoices").delete().eq("id", invoice.id);
      return res.status(500).json({ error: `Line items failed: ${lineError.message}` });
    }

    // 3. Log created event
    await supabase.from("invoice_events").insert({
      invoice_id: invoice.id,
      event_type: "created",
      actor: "admin",
    });

    // 4. Mirror to FreshBooks (non-fatal if it fails)
    const accountId = process.env.FRESHBOOKS_ACCOUNT_ID;
    if (accountId && client.freshbooks_contact_id) {
      try {
        const headers = await freshBooksHeaders();
        const fbLines = line_items.map((item) => ({
          type: 0,
          description: item.description.trim(),
          name: item.description.trim(),
          qty: Number(item.quantity ?? 1),
          unit_cost: { amount: String(Number(item.unit_price).toFixed(2)), code: currency },
        }));

        const fbRes = await fetch(
          `https://api.freshbooks.com/accounting/account/${accountId}/invoices/invoices`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              invoice: {
                customerid: client.freshbooks_contact_id,
                create_date: issue_date,
                due_offset_days: Math.round(
                  (new Date(due_date) - new Date(issue_date)) / (1000 * 60 * 60 * 24)
                ),
                currency_code: currency,
                lines: fbLines,
                notes: notes?.trim() || "",
              },
            }),
          }
        );

        if (fbRes.ok) {
          const fbData = await fbRes.json();
          const fbInvoice = fbData?.response?.result?.invoice;
          const freshbooksInvoiceId = String(fbInvoice?.id ?? "");
          const paymentUrl = fbInvoice?.v3_status === undefined
            ? null
            : `https://my.freshbooks.com/#/invoice/${freshbooksInvoiceId}`;

          if (freshbooksInvoiceId) {
            await supabase
              .from("invoices")
              .update({
                freshbooks_invoice_id: freshbooksInvoiceId,
                payment_url: paymentUrl,
              })
              .eq("id", invoice.id);

            invoice.freshbooks_invoice_id = freshbooksInvoiceId;
            invoice.payment_url = paymentUrl;
          }
        } else {
          console.error("FreshBooks invoice mirror failed:", await fbRes.text());
        }
      } catch (fbErr) {
        console.error("FreshBooks mirror error:", fbErr.message);
      }
    }

    // Return full invoice with line items
    const { data: full } = await supabase
      .from("invoices")
      .select(`*, clients ( id, name, email, company ), invoice_line_items ( * )`)
      .eq("id", invoice.id)
      .single();

    return res.status(201).json(full ?? invoice);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
