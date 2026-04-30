// api/billing/clients.js
// GET    /api/billing/clients        — list all clients
// POST   /api/billing/clients        — create client in Supabase + sync to FreshBooks
// PATCH  /api/billing/clients?id=X   — update client in Supabase + sync to FreshBooks
// DELETE /api/billing/clients?id=X   — archive in FreshBooks (vis_state=2) + delete from Supabase

import { createClient } from "@supabase/supabase-js";
import { freshBooksHeaders } from "./freshbooks.js";

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Normalize phone to E.164 (+1XXXXXXXXXX) if it looks like a US number.
// Returns the value unchanged if it's already E.164 or unrecognized.
function normalizePhone(raw) {
  if (!raw) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw; // already E.164 or international — leave as-is
}

// Org-first defaulting: when the user leaves name blank but provides a
// company, the company is the canonical client name. Mirrors the priority
// applied in sync-clients.js so manual creates stay consistent with sync.
function resolveClientName({ name, company }) {
  const n = name?.trim();
  if (n) return n;
  const c = company?.trim();
  return c || null;
}

export default async function handler(req, res) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  const supabase = getSupabaseAdmin();

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  // Verify billing access (admin or account_manager)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "account_manager"].includes(profile.role) || profile.status !== "active") {
    return res.status(403).json({ error: "Billing access required" });
  }

  // ── GET — list clients ────────────────────────────────────────────────────
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("name");

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // ── POST — create client ──────────────────────────────────────────────────
  if (req.method === "POST") {
    const { name, email, phone, company } = req.body ?? {};
    if (!name?.trim() && !company?.trim()) return res.status(400).json({ error: "name or company is required" });

    const normalizedPhone = normalizePhone(phone?.trim());
    const resolvedName = resolveClientName({ name, company });
    const resolvedCompany = company?.trim() || null;

    // 1. Insert into Supabase first
    const { data: client, error: insertError } = await supabase
      .from("clients")
      .insert({
        name: resolvedName,
        email: email?.trim() || null,
        phone: normalizedPhone || null,
        company: resolvedCompany,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) return res.status(500).json({ error: insertError.message });

    // 2. Sync to FreshBooks
    const accountId = process.env.FRESHBOOKS_ACCOUNT_ID;
    if (!accountId) {
      // FreshBooks not yet configured — return client without freshbooks_contact_id
      return res.status(201).json(client);
    }

    try {
      const headers = await freshBooksHeaders();
      // If the saved name equals the company, the user only typed a business
      // name — don't split it into fname/lname or FB will register a person
      // named "Sip Matcha Bar" inside the org "Sip Matcha Bar".
      const isOrgDerivedName =
        !!resolvedCompany && resolvedName === resolvedCompany;
      const fbClient = {
        email: email?.trim() || "",
        organization: resolvedCompany || "",
        mobile: normalizedPhone || "",
      };
      if (!isOrgDerivedName && resolvedName) {
        const parts = resolvedName.split(" ");
        fbClient.fname = parts[0] ?? resolvedName;
        fbClient.lname = parts.slice(1).join(" ") || "";
      }
      const fbRes = await fetch(
        `https://api.freshbooks.com/accounting/account/${accountId}/users/clients`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ client: fbClient }),
        }
      );

      if (fbRes.ok) {
        const fbData = await fbRes.json();
        const freshbooksContactId = String(fbData?.response?.result?.client?.id ?? "");

        if (freshbooksContactId) {
          // Store FreshBooks contact ID back in Supabase
          const { data: updated } = await supabase
            .from("clients")
            .update({ freshbooks_contact_id: freshbooksContactId })
            .eq("id", client.id)
            .select()
            .single();

          return res.status(201).json(updated ?? client);
        }
      } else {
        console.error("FreshBooks client sync failed:", await fbRes.text());
      }
    } catch (fbErr) {
      // FreshBooks sync failure is non-fatal — client is already saved in Supabase
      console.error("FreshBooks sync error:", fbErr.message);
    }

    return res.status(201).json(client);
  }

  // ── PATCH — update client ─────────────────────────────────────────────────
  if (req.method === "PATCH") {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "id is required" });

    const { name, email, phone, company } = req.body ?? {};
    if (!name?.trim() && !company?.trim()) return res.status(400).json({ error: "name or company is required" });

    const normalizedPhone = normalizePhone(phone?.trim());
    const resolvedName = resolveClientName({ name, company });
    const resolvedCompany = company?.trim() || null;

    // 1. Fetch existing client (need freshbooks_contact_id)
    const { data: existing, error: fetchErr } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) return res.status(404).json({ error: "Client not found" });

    // 2. Update in Supabase
    const { data: updated, error: updateErr } = await supabase
      .from("clients")
      .update({
        name: resolvedName,
        email: email?.trim() || null,
        phone: normalizedPhone || null,
        company: resolvedCompany,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) return res.status(500).json({ error: updateErr.message });

    // 3. Push to FreshBooks if synced (non-fatal)
    const accountId = process.env.FRESHBOOKS_ACCOUNT_ID;
    if (accountId && existing.freshbooks_contact_id) {
      try {
        const headers = await freshBooksHeaders();
        // Don't split a company-derived name into fname/lname — see POST.
        const isOrgDerivedName =
          !!updated.company && updated.name === updated.company;
        const fbBody = {
          organization: updated.company ?? "",
          email: updated.email ?? "",
          bus_phone: updated.phone ?? "",
        };
        if (!isOrgDerivedName && updated.name) {
          const nameParts = updated.name.split(" ");
          fbBody.fname = nameParts[0] ?? "";
          fbBody.lname = nameParts.slice(1).join(" ") ?? "";
        }
        const fbRes = await fetch(
          `https://api.freshbooks.com/accounting/account/${accountId}/users/clients/${existing.freshbooks_contact_id}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify({ client: fbBody }),
          }
        );
        if (fbRes.ok) {
          await supabase.from("clients")
            .update({ freshbooks_updated_at: new Date().toISOString() })
            .eq("id", id);
          updated.freshbooks_updated_at = new Date().toISOString();
        } else {
          console.error("FreshBooks update failed:", await fbRes.text());
        }
      } catch (fbErr) {
        console.error("FreshBooks update error:", fbErr.message);
      }
    }

    return res.status(200).json(updated);
  }

  // ── DELETE — archive in FreshBooks + delete locally ──────────────────────
  if (req.method === "DELETE") {
    if (profile.role !== "admin") {
      return res.status(403).json({ error: "Admin role required to delete clients" });
    }

    const id = req.query.id;
    const force = req.query.force === "true" || req.query.force === "1";
    if (!id) return res.status(400).json({ error: "id is required" });

    const { data: existing, error: fetchErr } = await supabase
      .from("clients")
      .select("id, name, freshbooks_contact_id")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) return res.status(404).json({ error: "Client not found" });

    // Force path bypasses the FB reconcile and cascades local invoice rows.
    // FB invoices remain untouched — the user is acknowledging they'll handle
    // those manually. Only admins reach this branch (gated above).
    // invoice_line_items + invoice_events both have ON DELETE CASCADE.
    if (force) {
      const { error: cascadeErr } = await supabase
        .from("invoices")
        .delete()
        .eq("client_id", id);
      if (cascadeErr) return res.status(500).json({ error: cascadeErr.message });
    }

    const { count: invoiceCount, error: invoiceErr } = force
      ? { count: 0, error: null }
      : await supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("client_id", id);

    if (invoiceErr) return res.status(500).json({ error: invoiceErr.message });

    let blockingCount = invoiceCount ?? 0;

    // Reconcile against FreshBooks: a local invoice may be a phantom of an
    // invoice that was deleted/archived in FB but never cleaned up locally.
    if (blockingCount > 0) {
      const accountId = process.env.FRESHBOOKS_ACCOUNT_ID;
      const { data: localInvoices } = await supabase
        .from("invoices")
        .select("id, freshbooks_invoice_id")
        .eq("client_id", id);

      if (accountId && localInvoices?.length) {
        for (const inv of localInvoices) {
          if (!inv.freshbooks_invoice_id) continue;
          try {
            const headers = await freshBooksHeaders();
            const fbRes = await fetch(
              `https://api.freshbooks.com/accounting/account/${accountId}/invoices/invoices/${inv.freshbooks_invoice_id}`,
              { headers }
            );
            let shouldDelete = false;
            if (fbRes.status === 404) {
              shouldDelete = true;
            } else if (fbRes.ok) {
              const body = await fbRes.json();
              if (body?.response?.result?.invoice?.vis_state === 2) shouldDelete = true;
            }
            if (shouldDelete) {
              await supabase.from("invoices").delete().eq("id", inv.id);
            }
          } catch (err) {
            // Transient FB/network error — keep the local row; fail safe.
            console.warn(`FB reconcile skipped for invoice ${inv.freshbooks_invoice_id}: ${err.message}`);
          }
        }

        const { count: freshCount } = await supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("client_id", id);
        blockingCount = freshCount ?? 0;
      }
    }

    if (blockingCount > 0) {
      return res.status(409).json({
        error: "client_has_invoices",
        invoice_count: blockingCount,
        message: `"${existing.name}" has ${blockingCount} invoice(s). Delete those first.`,
      });
    }

    let archivedInFreshbooks = false;
    let freshbooksArchiveError = null;
    const accountId = process.env.FRESHBOOKS_ACCOUNT_ID;
    if (accountId && existing.freshbooks_contact_id) {
      try {
        const headers = await freshBooksHeaders();
        const fbRes = await fetch(
          `https://api.freshbooks.com/accounting/account/${accountId}/users/clients/${existing.freshbooks_contact_id}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify({ client: { vis_state: 2 } }),
          }
        );

        if (fbRes.ok) {
          archivedInFreshbooks = true;
        } else if (fbRes.status === 404) {
          // FB already lost the record — proceed with local delete
          console.warn(`FreshBooks client ${existing.freshbooks_contact_id} not found; archive skipped.`);
        } else {
          const body = await fbRes.text();
          freshbooksArchiveError = { status: fbRes.status, body };
        }
      } catch (err) {
        // Token refresh / network failure — capture for the non-force branch.
        freshbooksArchiveError = { status: 0, body: err.message };
      }
    }

    // Non-force delete: FB failure is fatal so the user can fix FB auth first.
    // Force delete: user has accepted manual FB cleanup, proceed with local delete.
    if (freshbooksArchiveError && !force) {
      return res.status(502).json({
        error: "freshbooks_archive_failed",
        ...freshbooksArchiveError,
      });
    }

    const { error: deleteErr } = await supabase.from("clients").delete().eq("id", id);
    if (deleteErr) return res.status(500).json({ error: deleteErr.message });

    return res.status(200).json({ ok: true, archived_in_freshbooks: archivedInFreshbooks });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
