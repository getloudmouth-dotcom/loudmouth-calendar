// api/billing/freshbooks-callback.js
// ONE-TIME USE — handles the FreshBooks OAuth code exchange.
// After completing the OAuth flow, copy FRESHBOOKS_REFRESH_TOKEN and
// FRESHBOOKS_ACCOUNT_ID from the Vercel logs, add them as env vars, then DELETE this file.

const TOKEN_URL = "https://api.freshbooks.com/auth/oauth/token";
const ME_URL = "https://api.freshbooks.com/auth/api/v1/users/me";
const REDIRECT_URI = "https://loudmouth-calendar.vercel.app/api/billing/freshbooks-callback";

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`FreshBooks OAuth error: ${error}`);
  }

  if (!code) {
    return res.status(400).send("Missing ?code param. Visit the FreshBooks authorization URL first.");
  }

  const clientId = process.env.FRESHBOOKS_CLIENT_ID;
  const clientSecret = process.env.FRESHBOOKS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send("Missing FRESHBOOKS_CLIENT_ID or FRESHBOOKS_CLIENT_SECRET env vars.");
  }

  // Exchange authorization code for tokens
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("Token exchange failed:", body);
    return res.status(500).send(`Token exchange failed (${tokenRes.status}): ${body}`);
  }

  const tokens = await tokenRes.json();
  const { access_token, refresh_token } = tokens;

  // Fetch the FreshBooks account ID
  const meRes = await fetch(ME_URL, {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!meRes.ok) {
    const body = await meRes.text();
    console.error("Failed to fetch FreshBooks user:", body);
    return res.status(500).send(`Could not fetch FreshBooks account ID: ${body}`);
  }

  const me = await meRes.json();
  const accountId = me?.response?.business_memberships?.[0]?.business?.account_id;

  // Log to Vercel — copy these values from your function logs
  console.log("=== FRESHBOOKS OAUTH SUCCESS ===");
  console.log("FRESHBOOKS_REFRESH_TOKEN:", refresh_token);
  console.log("FRESHBOOKS_ACCOUNT_ID:", accountId);
  console.log("================================");

  return res.status(200).json({
    message: "OAuth complete. Copy FRESHBOOKS_REFRESH_TOKEN and FRESHBOOKS_ACCOUNT_ID from Vercel logs, add them as env vars, then delete this file.",
    account_id: accountId,
    // Intentionally NOT returning refresh_token in the response body — logs only
  });
}
