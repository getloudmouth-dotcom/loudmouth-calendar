// api/billing/sync-clients.js
// GET /api/billing/sync-clients — pull all clients from FreshBooks, upsert into Supabase.
// Last-write wins: if FreshBooks record is newer → update local.
//                  if local record is newer → push local to FreshBooks.

import { createClient } from "@supabase/supabase-js";
import { freshBooksHeaders } from "./freshbooks.js";

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function normalizePhone(raw) {
  if (!raw) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw;
}

function parseName(fname, lname) {
  return [fname, lname].filter(Boolean).join(" ").trim();
}

function fbPhone(client) {
  return client.bus_phone || client.mob_phone || client.home_phone || "";
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

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

  // ── Fetch all FreshBooks clients (paginated) ──────────────────────────────
  let allFbClients = [];
  let page = 1;

  try {
    while (true) {
      const headers = await freshBooksHeaders();
      const fbRes = await fetch(
        `https://api.freshbooks.com/accounting/account/${accountId}/users/clients?page=${page}&per_page=100&search[vis_state]=0`,
        { headers }
      );
      if (!fbRes.ok) {
        const body = await fbRes.text();
        return res.status(502).json({ error: `FreshBooks fetch failed (${fbRes.status}): ${body}` });
      }
      const data = await fbRes.json();
      const result = data?.response?.result;
      const batch = result?.clients ?? [];
      allFbClients.push(...batch);
      if (page >= (result?.pages?.pages ?? 1)) break;
      page++;
    }
  } catch (err) {
    return res.status(502).json({ error: `FreshBooks error: ${err.message}` });
  }

  // ── Load all local clients ─────────────────────────────────────────────────
  const { data: localClients, error: localErr } = await supabase.from("clients").select("*");
  if (localErr) return res.status(500).json({ error: localErr.message });

  const byFbId = Object.fromEntries(
    (localClients ?? [])
      .filter(c => c.freshbooks_contact_id)
      .map(c => [c.freshbooks_contact_id, c])
  );
  // Secondary index: unsynced local clients by name (for linking existing records)
  const unsyncedByName = Object.fromEntries(
    (localClients ?? [])
      .filter(c => !c.freshbooks_contact_id && c.name)
      .map(c => [c.name.toLowerCase(), c])
  );

  let created = 0, updated = 0, pushed = 0, skipped = 0;
  const errors = [];

  for (const fb of allFbClients) {
    const fbId = String(fb.id);
    // FreshBooks timestamps are UTC but have no timezone suffix — append " UTC"
    const fbUpdated = new Date(`${fb.updated} UTC`);
    const name = parseName(fb.fname, fb.lname) || fb.organization || null;
    const company = fb.organization || null;
    const email = fb.email || null;
    const phone = normalizePhone(fbPhone(fb)) || null;

    // Primary lookup: match by freshbooks_contact_id
    let local = byFbId[fbId];

    // Fallback: if not found by FB ID, check if an unsynced local client has the same name
    if (!local && name) {
      local = unsyncedByName[name.toLowerCase()];
      if (local) {
        // Link existing local record to FreshBooks — update its freshbooks_contact_id
        await supabase.from("clients").update({
          freshbooks_contact_id: fbId,
          freshbooks_updated_at: fbUpdated.toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", local.id);
        byFbId[fbId] = { ...local, freshbooks_contact_id: fbId };
        updated++;
        continue;
      }
    }

    if (!local) {
      // ── New client from FreshBooks — insert locally ──────────────────────
      const { error: insertErr } = await supabase.from("clients").insert({
        name,
        company,
        email,
        phone,
        freshbooks_contact_id: fbId,
        freshbooks_updated_at: fbUpdated.toISOString(),
        created_by: user.id,
      });
      if (insertErr) {
        errors.push({ fbId, name: name ?? company, error: insertErr.message });
        continue;
      }
      created++;
      continue;
    }

    const localUpdatedAt = new Date(local.updated_at ?? 0);
    const localFbUpdatedAt = new Date(local.freshbooks_updated_at ?? 0);

    if (fbUpdated > localFbUpdatedAt) {
      // ── FreshBooks is newer — overwrite local ────────────────────────────
      await supabase.from("clients").update({
        name: name ?? local.name,
        company: company ?? local.company,
        email: email ?? local.email,
        phone: phone ?? local.phone,
        freshbooks_updated_at: fbUpdated.toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", local.id);
      updated++;
    } else if (localUpdatedAt > localFbUpdatedAt) {
      // ── Local is newer — push to FreshBooks ──────────────────────────────
      try {
        const nameParts = (local.name ?? "").split(" ");
        const headers = await freshBooksHeaders();
        const pushRes = await fetch(
          `https://api.freshbooks.com/accounting/account/${accountId}/users/clients/${fbId}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify({
              client: {
                fname: nameParts[0] ?? "",
                lname: nameParts.slice(1).join(" ") ?? "",
                organization: local.company ?? "",
                email: local.email ?? "",
                bus_phone: local.phone ?? "",
              },
            }),
          }
        );
        if (pushRes.ok) {
          await supabase.from("clients")
            .update({ freshbooks_updated_at: new Date().toISOString() })
            .eq("id", local.id);
          pushed++;
        } else {
          console.error("FreshBooks push failed for", fbId, await pushRes.text());
          skipped++;
        }
      } catch (pushErr) {
        console.error("FreshBooks push error:", pushErr.message);
        skipped++;
      }
    } else {
      skipped++;
    }
  }

  return res.status(200).json({ created, updated, pushed, skipped, total: allFbClients.length, errors });
}
