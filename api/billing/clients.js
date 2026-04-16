// api/billing/clients.js
// GET  /api/billing/clients        — list all clients
// POST /api/billing/clients        — create client in Supabase + sync to FreshBooks

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
    if (!name?.trim()) return res.status(400).json({ error: "name is required" });

    const normalizedPhone = normalizePhone(phone?.trim());

    // 1. Insert into Supabase first
    const { data: client, error: insertError } = await supabase
      .from("clients")
      .insert({
        name: name.trim(),
        email: email?.trim() || null,
        phone: normalizedPhone || null,
        company: company?.trim() || null,
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
      const fbRes = await fetch(
        `https://api.freshbooks.com/accounting/account/${accountId}/users/clients`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            client: {
              fname: name.trim().split(" ")[0] ?? name.trim(),
              lname: name.trim().split(" ").slice(1).join(" ") || "",
              email: email?.trim() || "",
              organization: company?.trim() || "",
              mobile: normalizedPhone || "",
            },
          }),
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

  return res.status(405).json({ error: "Method not allowed" });
}
