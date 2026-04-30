// api/billing/freshbooks-callback.js
// One-time OAuth callback — exchanges authorization code for access + refresh tokens,
// then persists them directly to Supabase so the app can start using them immediately.

import { createClient } from "@supabase/supabase-js";
import { withSentry } from '../_sentry.js';

const ACCOUNT_ID = "A4BW8E";

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`<pre>FreshBooks auth error: ${error}</pre>`);
  }

  if (!code) {
    return res.status(400).send("<pre>No authorization code received.</pre>");
  }

  const clientId = process.env.FRESHBOOKS_CLIENT_ID;
  const clientSecret = process.env.FRESHBOOKS_CLIENT_SECRET;
  const redirectUri = "https://loudmouth-calendar.vercel.app/api/billing/freshbooks-callback";

  const tokenRes = await fetch("https://api.freshbooks.com/auth/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await tokenRes.json();

  if (!tokenRes.ok) {
    return res.status(500).send(`<pre>Token exchange failed:\n${JSON.stringify(data, null, 2)}</pre>`);
  }

  // Auto-persist tokens to Supabase so the app can use them immediately (no manual copy needed)
  let saveStatus = "skipped (no refresh_token in response)";
  if (data.refresh_token) {
    try {
      const supabase = getSupabaseAdmin();
      const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString();
      await supabase.from("freshbooks_tokens").upsert({
        account_id: ACCOUNT_ID,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      });
      saveStatus = "saved to Supabase";
    } catch (err) {
      saveStatus = `Supabase save failed: ${err.message}`;
    }
  }

  return res.status(200).send(`
    <html><body style="font-family:monospace;padding:2rem;background:#111;color:#d7fa06">
      <h2>FreshBooks Token Exchange Success</h2>
      <p><strong>Tokens saved: ${saveStatus}</strong></p>
      <hr/>
      <p><strong>access_token</strong> (expires in ${data.expires_in}s):</p>
      <pre style="background:#222;padding:1rem;word-break:break-all">${data.access_token}</pre>
      <p><strong>refresh_token</strong>:</p>
      <pre style="background:#222;padding:1rem;word-break:break-all;color:#3B82F6">${data.refresh_token}</pre>
      <hr/>
      <p style="color:#999">Full response:</p>
      <pre style="background:#222;padding:1rem">${JSON.stringify(data, null, 2)}</pre>
    </body></html>
  `);
}

export default withSentry(handler);
