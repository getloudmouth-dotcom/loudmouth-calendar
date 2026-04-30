// api/billing/freshbooks-auth.js
// GET — admin only. Returns FreshBooks token freshness + an OAuth authorize URL
// that the user can open in a new tab to reconnect when the refresh token has
// gone stale. Mirrors the existing freshbooks-callback.js redirect URI.

import { createClient } from "@supabase/supabase-js";
import { withSentry } from '../_sentry.js';

const ACCOUNT_ID = "A4BW8E";
const REDIRECT_URI = "https://loudmouth-calendar.vercel.app/api/billing/freshbooks-callback";

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

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

  if (!profile || profile.role !== "admin" || profile.status !== "active") {
    return res.status(403).json({ error: "Admin role required" });
  }

  const clientId = process.env.FRESHBOOKS_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: "FRESHBOOKS_CLIENT_ID not configured" });

  const { data: row } = await supabase
    .from("freshbooks_tokens")
    .select("expires_at, updated_at, refresh_token")
    .eq("account_id", ACCOUNT_ID)
    .single();

  // Staleness is computed server-side so the React component stays pure.
  // Threshold: 30 days since last refresh-token rotation. FB refresh tokens
  // are long-lived but can be revoked silently — surface a warning early.
  const now = Date.now();
  const expiresAt = row?.expires_at ? new Date(row.expires_at).getTime() : null;
  const updatedAt = row?.updated_at ? new Date(row.updated_at).getTime() : null;
  const status = {
    connected: !!row?.refresh_token,
    expires_at: row?.expires_at ?? null,
    updated_at: row?.updated_at ?? null,
    access_token_expired: expiresAt ? now >= expiresAt : true,
    stale: updatedAt ? now - updatedAt > 30 * 24 * 60 * 60 * 1000 : true,
  };

  const authorizeUrl =
    `https://auth.freshbooks.com/oauth/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  return res.status(200).json({ status, authorize_url: authorizeUrl });
}

export default withSentry(handler);
