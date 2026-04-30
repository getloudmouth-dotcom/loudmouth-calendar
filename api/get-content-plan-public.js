// /api/get-content-plan-public.js
// GET ?token=TOKEN
// Returns content plan + items for public (no-auth) client view.
// Access is gated by the share token, not by Supabase auth.

import { createClient } from "@supabase/supabase-js";
import { withSentry } from './_sentry.js';

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
  if (req.method !== "GET") return res.status(405).end();

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Missing token" });

  let sb;
  try { sb = getSupabaseAdmin(); } catch (e) { return res.status(503).json({ error: e.message }); }

  const { data: share, error: shareErr } = await sb
    .from("content_plan_shares")
    .select("*")
    .eq("token", token)
    .single();

  if (shareErr || !share) return res.status(404).json({ error: "Invalid or expired link" });
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return res.status(410).json({ error: "This link has expired" });
  }

  const [{ data: plan, error: planErr }, { data: items, error: itemsErr }] = await Promise.all([
    sb.from("content_plans").select("*").eq("id", share.plan_id).single(),
    sb.from("content_plan_items").select("*").eq("plan_id", share.plan_id)
      .order("item_type").order("item_number"),
  ]);

  if (planErr || !plan) return res.status(404).json({ error: "Plan not found" });

  return res.status(200).json({
    plan,
    items: items || [],
    share: { allow_client_notes: share.allow_client_notes },
  });
}

export default withSentry(handler);
