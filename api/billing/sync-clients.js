// api/billing/sync-clients.js
// GET /api/billing/sync-clients — pull all clients from FreshBooks, upsert into Supabase.
// Last-write wins: if FreshBooks record is newer → update local.
//                  if local record is newer → push local to FreshBooks.

import { createClient } from "@supabase/supabase-js";
import { freshBooksHeaders } from "./freshbooks.js";
import { withSentry } from '../_sentry.js';

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

// Org-first naming: a FreshBooks client's "true" name is the organization
// when set, falling back to the person's name. This makes "Sip Matcha Bar"
// (org) win over "Val" (fname) so the canonical client name reflects the
// business, which is what shows up in invoicing and the client list.
function pickClientName({ organization, fname, lname }) {
  const org = organization?.trim();
  if (org) return org;
  const person = parseName(fname, lname);
  return person || null;
}

// The previous derivation used parseName-first with org as fallback. To detect
// whether a local row was auto-derived (and is therefore safe to re-derive),
// we check against both the old and new rules. A row that matches either is
// considered auto-derived; a row matching neither is a manual override.
function legacyClientName({ organization, fname, lname }) {
  return parseName(fname, lname) || organization?.trim() || null;
}

function fbPhone(client) {
  return client.bus_phone || client.mob_phone || client.home_phone || "";
}

async function handler(req, res) {
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
        `https://api.freshbooks.com/accounting/account/${accountId}/users/clients?page=${page}&per_page=100`,
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

  // FreshBooks vis_state: 0 = active, 1 = deleted, 2 = archived. We previously
  // filtered the request URL to vis_state=0, which excluded archived clients
  // the user added manually in FreshBooks. Pull everything except deleted —
  // archived clients should still sync into the app. The in-app smm_active
  // toggle is a separate UI filter and is not affected by this.
  const visibleFbClients = allFbClients.filter(c => c.vis_state !== 1);

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

  for (const fb of visibleFbClients) {
    const fbId = String(fb.id);
    // FreshBooks timestamps are UTC but have no timezone suffix — append " UTC"
    const fbUpdated = new Date(`${fb.updated} UTC`);
    const name = pickClientName(fb);
    const legacyName = legacyClientName(fb);
    const company = fb.organization?.trim() || null;
    const email = fb.email || null;
    const phone = normalizePhone(fbPhone(fb)) || null;

    // Primary lookup: match by freshbooks_contact_id
    let local = byFbId[fbId];

    // Fallback: if not found by FB ID, check if an unsynced local client has
    // the same name. Try the new org-first name first, then the legacy name —
    // either match means the local row corresponds to this FB client.
    if (!local) {
      const candidates = [name, legacyName].filter(Boolean);
      for (const candidate of candidates) {
        local = unsyncedByName[candidate.toLowerCase()];
        if (local) break;
      }
      if (local) {
        // Link existing local record to FreshBooks. Also adopt the org-first
        // name and FB's company/email/phone so the canonical record updates.
        await supabase.from("clients").update({
          name: name ?? local.name,
          company: company ?? local.company,
          email: email ?? local.email,
          phone: phone ?? local.phone,
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
      // Re-derive name only when the local name was auto-derived (matches the
      // current or legacy rule). A name that matches neither was edited by a
      // user — preserve it.
      const nameWasAutoDerived =
        !local.name || local.name === legacyName || local.name === name;
      const nextName = nameWasAutoDerived ? (name ?? local.name) : local.name;
      await supabase.from("clients").update({
        name: nextName,
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
        const headers = await freshBooksHeaders();
        // When the local name was derived from the company (org-first), don't
        // push fname/lname back — that would clobber FB's person record by
        // splitting the company name. Only push fname/lname when the local
        // name is genuinely a person name distinct from company.
        const isOrgDerivedName =
          !!local.company && local.name === local.company;
        const fbBody = {
          organization: local.company ?? "",
          email: local.email ?? "",
          bus_phone: local.phone ?? "",
        };
        if (!isOrgDerivedName && local.name) {
          const nameParts = local.name.split(" ");
          fbBody.fname = nameParts[0] ?? "";
          fbBody.lname = nameParts.slice(1).join(" ") ?? "";
        }
        const pushRes = await fetch(
          `https://api.freshbooks.com/accounting/account/${accountId}/users/clients/${fbId}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify({ client: fbBody }),
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

  return res.status(200).json({
    created, updated, pushed, skipped, errors,
    total: visibleFbClients.length,
    fetched: allFbClients.length,
    _debug_fb_clients: visibleFbClients.map(c => ({
      id: c.id,
      vis_state: c.vis_state,
      name: pickClientName(c),
    })),
  });
}

export default withSentry(handler);
