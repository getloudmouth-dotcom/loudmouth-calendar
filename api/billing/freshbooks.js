// api/billing/freshbooks.js
// Reusable FreshBooks OAuth2 module — not a route.
// Import getFreshBooksToken() in other billing routes to get a valid access token.
// Handles token exchange, in-memory caching, and auto-refresh.

import { createClient } from "@supabase/supabase-js";

const TOKEN_URL = "https://api.freshbooks.com/auth/oauth/token";
const ACCOUNT_ID = "A4BW8E";

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

// In-memory token cache (lives for the lifetime of the function instance)
let cachedToken = null;
let tokenExpiresAt = 0;

export async function getFreshBooksToken() {
  const now = Date.now();

  // Return cached token if still valid (with 60s buffer before expiry)
  if (cachedToken && now < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const clientId = process.env.FRESHBOOKS_CLIENT_ID;
  const clientSecret = process.env.FRESHBOOKS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing FreshBooks env vars: FRESHBOOKS_CLIENT_ID, FRESHBOOKS_CLIENT_SECRET");
  }

  const supabase = getSupabaseAdmin();
  const { data: tokenRow } = await supabase
    .from("freshbooks_tokens")
    .select("refresh_token")
    .eq("account_id", ACCOUNT_ID)
    .single();
  const refreshToken = tokenRow?.refresh_token ?? process.env.FRESHBOOKS_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error("No FreshBooks refresh token found in Supabase or env vars");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FreshBooks token refresh failed (${res.status}): ${body}`);
  }

  const data = await res.json();

  cachedToken = data.access_token;
  // FreshBooks access tokens are valid for 1 hour (3600s)
  tokenExpiresAt = now + (data.expires_in ?? 3600) * 1000;

  // Persist the new rotating refresh token back to Supabase
  if (data.refresh_token) {
    await supabase
      .from("freshbooks_tokens")
      .upsert({
        account_id: ACCOUNT_ID,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: new Date(tokenExpiresAt).toISOString(),
        updated_at: new Date().toISOString(),
      });
  }

  return cachedToken;
}

// Convenience wrapper: returns headers ready to pass to FreshBooks API calls
export async function freshBooksHeaders() {
  const token = await getFreshBooksToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Api-Version": "alpha",
  };
}
