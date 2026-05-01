// api/billing/reconcile-clients.js
// Manual reconciliation tool for FreshBooks ↔ app clients (admin-only).
//
// GET  /api/billing/reconcile-clients
//      → { fbClients: [...], appClients: [...] } — non-mutating snapshot.
//
// POST /api/billing/reconcile-clients  with one of:
//      { action: "link", freshbooks_contact_id, app_client_id }
//        Sets the FB contact id on the chosen app client and adopts FB's
//        canonical name/company/email/phone (org-first naming).
//
//      { action: "merge", source_client_id, target_client_id }
//        Moves all calendars/invoices and renames scheduled_posts/content_plans
//        from source → target, then deletes source. Transfers source's FB
//        contact id when target has none.

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

function pickClientName({ organization, fname, lname }) {
  const org = organization?.trim();
  if (org) return org;
  const person = parseName(fname, lname);
  return person || null;
}

function fbPhone(c) {
  return c.bus_phone || c.mob_phone || c.home_phone || "";
}

async function fetchAllFbClients(accountId) {
  const all = [];
  let page = 1;
  while (true) {
    const headers = await freshBooksHeaders();
    const res = await fetch(
      `https://api.freshbooks.com/accounting/account/${accountId}/users/clients?page=${page}&per_page=100`,
      { headers }
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`FreshBooks fetch failed (${res.status}): ${body}`);
    }
    const data = await res.json();
    const result = data?.response?.result;
    all.push(...(result?.clients ?? []));
    if (page >= (result?.pages?.pages ?? 1)) break;
    page++;
  }
  // Exclude only deleted clients (vis_state=1). Archived (2) is intentional —
  // those are clients the user added manually in FreshBooks and still wants
  // visible in the app's reconcile UI.
  return all.filter(c => c.vis_state !== 1);
}

async function fetchOneFbClient(accountId, fbId) {
  const headers = await freshBooksHeaders();
  const res = await fetch(
    `https://api.freshbooks.com/accounting/account/${accountId}/users/clients/${fbId}`,
    { headers }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FreshBooks fetch failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data?.response?.result?.client ?? null;
}

async function handler(req, res) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  const supabase = getSupabaseAdmin();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  // Reconcile is admin-only — destructive merges and FB-id rewrites should
  // not be available to account managers.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin" || profile.status !== "active") {
    return res.status(403).json({ error: "Admin access required" });
  }

  const accountId = process.env.FRESHBOOKS_ACCOUNT_ID;
  if (!accountId) return res.status(500).json({ error: "FRESHBOOKS_ACCOUNT_ID not configured" });

  // ── GET — snapshot for the reconcile UI ───────────────────────────────────
  if (req.method === "GET") {
    let fbRaw;
    try {
      fbRaw = await fetchAllFbClients(accountId);
    } catch (e) {
      return res.status(502).json({ error: e.message });
    }
    const fbClients = fbRaw.map(c => ({
      freshbooks_contact_id: String(c.id),
      preferred_name: pickClientName(c),
      organization: c.organization?.trim() || null,
      fname: c.fname || null,
      lname: c.lname || null,
      email: c.email || null,
      phone: normalizePhone(fbPhone(c)) || null,
      updated: c.updated || null,
    }));

    const { data: appClients, error: appErr } = await supabase
      .from("clients")
      .select("*")
      .order("name");
    if (appErr) return res.status(500).json({ error: appErr.message });

    return res.status(200).json({ fbClients, appClients: appClients ?? [] });
  }

  // ── POST — link or merge ──────────────────────────────────────────────────
  if (req.method === "POST") {
    const action = req.body?.action;

    if (action === "link") {
      const { freshbooks_contact_id, app_client_id } = req.body ?? {};
      if (!freshbooks_contact_id || !app_client_id) {
        return res.status(400).json({ error: "freshbooks_contact_id and app_client_id required" });
      }

      // Fetch the app client we're about to overwrite.
      const { data: appClient, error: appErr } = await supabase
        .from("clients")
        .select("*")
        .eq("id", app_client_id)
        .single();
      if (appErr || !appClient) return res.status(404).json({ error: "App client not found" });

      // Block if it's already linked to a different FB contact — admin must
      // unlink/merge first to avoid silent reassignment.
      if (appClient.freshbooks_contact_id && appClient.freshbooks_contact_id !== String(freshbooks_contact_id)) {
        return res.status(409).json({
          error: "app_client_already_linked",
          message: `"${appClient.name}" is already linked to FreshBooks contact ${appClient.freshbooks_contact_id}. Unlink or merge first.`,
        });
      }

      // Block if another app client already owns this FB id — admin must
      // resolve the duplicate (merge into the existing one) before re-linking.
      const { data: existingLinked } = await supabase
        .from("clients")
        .select("id, name")
        .eq("freshbooks_contact_id", String(freshbooks_contact_id))
        .neq("id", app_client_id)
        .maybeSingle();
      if (existingLinked) {
        return res.status(409).json({
          error: "freshbooks_contact_already_linked",
          message: `FreshBooks contact is already linked to "${existingLinked.name}". Merge that client into "${appClient.name}" instead.`,
          existing_app_client_id: existingLinked.id,
          existing_app_client_name: existingLinked.name,
        });
      }

      // Pull the FB record to seed canonical fields.
      let fb;
      try {
        fb = await fetchOneFbClient(accountId, freshbooks_contact_id);
      } catch (e) {
        return res.status(502).json({ error: e.message });
      }
      if (!fb) return res.status(404).json({ error: "FreshBooks contact not found" });

      const fbUpdated = fb.updated ? new Date(`${fb.updated} UTC`).toISOString() : new Date().toISOString();
      const updates = {
        name: pickClientName(fb),
        company: fb.organization?.trim() || null,
        email: fb.email || null,
        phone: normalizePhone(fbPhone(fb)) || null,
        freshbooks_contact_id: String(freshbooks_contact_id),
        freshbooks_updated_at: fbUpdated,
        updated_at: new Date().toISOString(),
      };

      const { data: linked, error: updErr } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", app_client_id)
        .select()
        .single();
      if (updErr) return res.status(500).json({ error: updErr.message });

      return res.status(200).json({ ok: true, client: linked });
    }

    if (action === "merge") {
      const { source_client_id, target_client_id } = req.body ?? {};
      if (!source_client_id || !target_client_id) {
        return res.status(400).json({ error: "source_client_id and target_client_id required" });
      }
      if (source_client_id === target_client_id) {
        return res.status(400).json({ error: "source and target must differ" });
      }

      const { data: source } = await supabase
        .from("clients")
        .select("*")
        .eq("id", source_client_id)
        .single();
      const { data: target } = await supabase
        .from("clients")
        .select("*")
        .eq("id", target_client_id)
        .single();
      if (!source) return res.status(404).json({ error: "Source client not found" });
      if (!target) return res.status(404).json({ error: "Target client not found" });

      // Move FKs ─────────────────────────────────────────────────────────────
      const { data: invMoved, error: invErr } = await supabase
        .from("invoices")
        .update({ client_id: target_client_id })
        .eq("client_id", source_client_id)
        .select("id");
      if (invErr) return res.status(500).json({ error: `invoices move failed: ${invErr.message}` });

      const { data: calMoved, error: calErr } = await supabase
        .from("calendars")
        .update({ client_id: target_client_id })
        .eq("client_id", source_client_id)
        .select("id");
      if (calErr) return res.status(500).json({ error: `calendars move failed: ${calErr.message}` });

      // Rename string-matched references. These tables key on client_name,
      // not client_id, so the source name must be replaced with the target's
      // current name to keep them connected.
      let postsRenamed = 0;
      let plansRenamed = 0;
      let calendarsRenamed = 0;
      if (source.name && target.name && source.name !== target.name) {
        const { data: posts, error: postsErr } = await supabase
          .from("scheduled_posts")
          .update({ client_name: target.name })
          .eq("client_name", source.name)
          .select("id");
        if (postsErr) return res.status(500).json({ error: `scheduled_posts rename failed: ${postsErr.message}` });
        postsRenamed = posts?.length ?? 0;

        const { data: plans, error: plansErr } = await supabase
          .from("content_plans")
          .update({ client_name: target.name })
          .eq("client_name", source.name)
          .select("id");
        if (plansErr) return res.status(500).json({ error: `content_plans rename failed: ${plansErr.message}` });
        plansRenamed = plans?.length ?? 0;

        // calendars.client_name is denormalized too — keep it in sync with the
        // target so the hub doesn't render the merged-away source name.
        const { data: cals, error: calNameErr } = await supabase
          .from("calendars")
          .update({ client_name: target.name })
          .eq("client_id", target_client_id)
          .eq("client_name", source.name)
          .select("id");
        if (calNameErr) return res.status(500).json({ error: `calendars rename failed: ${calNameErr.message}` });
        calendarsRenamed = cals?.length ?? 0;
      }

      // Transfer FB id if target lacks one. UNIQUE constraint forces us to
      // clear the source first.
      let fbIdTransferred = false;
      if (source.freshbooks_contact_id && !target.freshbooks_contact_id) {
        const { error: clearErr } = await supabase
          .from("clients")
          .update({ freshbooks_contact_id: null })
          .eq("id", source_client_id);
        if (clearErr) return res.status(500).json({ error: `clear source FB id failed: ${clearErr.message}` });

        const { error: setErr } = await supabase
          .from("clients")
          .update({
            freshbooks_contact_id: source.freshbooks_contact_id,
            freshbooks_updated_at: source.freshbooks_updated_at,
            updated_at: new Date().toISOString(),
          })
          .eq("id", target_client_id);
        if (setErr) return res.status(500).json({ error: `set target FB id failed: ${setErr.message}` });
        fbIdTransferred = true;
      }

      const { error: delErr } = await supabase
        .from("clients")
        .delete()
        .eq("id", source_client_id);
      if (delErr) return res.status(500).json({ error: `delete source failed: ${delErr.message}` });

      return res.status(200).json({
        ok: true,
        invoicesMoved: invMoved?.length ?? 0,
        calendarsMoved: calMoved?.length ?? 0,
        calendarsRenamed,
        scheduledPostsRenamed: postsRenamed,
        contentPlansRenamed: plansRenamed,
        fbIdTransferred,
      });
    }

    return res.status(400).json({ error: "Unknown action. Use 'link' or 'merge'." });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withSentry(handler);
