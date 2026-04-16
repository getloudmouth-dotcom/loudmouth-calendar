// api/billing/freshbooks-callback.js
// One-time OAuth callback — exchanges authorization code for access + refresh tokens.
// Visit /api/billing/freshbooks-callback after authorizing in FreshBooks.

export default async function handler(req, res) {
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

  // Display tokens — copy the refresh_token and update env vars
  return res.status(200).send(`
    <html><body style="font-family:monospace;padding:2rem;background:#111;color:#d7fa06">
      <h2>FreshBooks Token Exchange Success</h2>
      <p><strong>Copy the refresh_token below and update your env vars.</strong></p>
      <hr/>
      <p><strong>access_token</strong> (expires in ${data.expires_in}s):</p>
      <pre style="background:#222;padding:1rem;word-break:break-all">${data.access_token}</pre>
      <p><strong>refresh_token</strong> (save this — update FRESHBOOKS_REFRESH_TOKEN):</p>
      <pre style="background:#222;padding:1rem;word-break:break-all;color:#3B82F6">${data.refresh_token}</pre>
      <hr/>
      <p style="color:#999">Full response:</p>
      <pre style="background:#222;padding:1rem">${JSON.stringify(data, null, 2)}</pre>
    </body></html>
  `);
}
