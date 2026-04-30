// /api/update-content-plan-item.js
// POST body: { token, itemId, field, value }
// Allows public clients to update approval_status or client_notes on a content plan item.
// Access is gated by share token — no Supabase auth required.

import { createClient } from "@supabase/supabase-js";
import { withSentry } from './_sentry.js';

const ALLOWED_FIELDS = ["approval_status", "client_notes"];
const VALID_APPROVAL_STATUSES = ["pending", "approved", "denied"];

let _supabaseCache = { url: "", key: "", client: null };
function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or service key");
  if (_supabaseCache.client && _supabaseCache.url === url && _supabaseCache.key === key) return _supabaseCache.client;
  _supabaseCache = { url, key, client: createClient(url, key, { auth: { persistSession: false } }) };
  return _supabaseCache.client;
}

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { token, itemId, field, value } = req.body || {};
  if (!token || !itemId || !field || value === undefined) {
    return res.status(400).json({ error: "Missing required fields: token, itemId, field, value" });
  }
  if (!ALLOWED_FIELDS.includes(field)) {
    return res.status(403).json({ error: "Field not allowed" });
  }

  let sb;
  try { sb = getSupabaseAdmin(); } catch (e) { return res.status(503).json({ error: e.message }); }

  // Validate share token
  const { data: share, error: shareErr } = await sb
    .from("content_plan_shares")
    .select("*")
    .eq("token", token)
    .single();

  if (shareErr || !share) return res.status(404).json({ error: "Invalid or expired token" });
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return res.status(410).json({ error: "This link has expired" });
  }
  if (field === "client_notes" && !share.allow_client_notes) {
    return res.status(403).json({ error: "Client notes are not allowed on this plan" });
  }

  // Validate field-specific values
  if (field === "approval_status" && !VALID_APPROVAL_STATUSES.includes(value)) {
    return res.status(400).json({ error: "Invalid approval_status value" });
  }

  // Verify the item belongs to this plan
  const { data: item, error: itemErr } = await sb
    .from("content_plan_items")
    .select("id, plan_id")
    .eq("id", itemId)
    .single();

  if (itemErr || !item) return res.status(404).json({ error: "Item not found" });
  if (item.plan_id !== share.plan_id) return res.status(403).json({ error: "Item does not belong to this plan" });

  const { error: updateErr } = await sb
    .from("content_plan_items")
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq("id", itemId);

  if (updateErr) return res.status(500).json({ error: updateErr.message });

  return res.status(200).json({ success: true });
}

export default withSentry(handler);
