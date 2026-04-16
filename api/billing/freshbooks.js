// api/billing/freshbooks.js
// Reusable FreshBooks OAuth2 module — not a route.
// Import getFreshBooksToken() in other billing routes to get a valid access token.
// Handles token exchange, in-memory caching, and auto-refresh.

const TOKEN_URL = "https://api.freshbooks.com/auth/oauth/token";

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
  const refreshToken = process.env.FRESHBOOKS_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing FreshBooks env vars: FRESHBOOKS_CLIENT_ID, FRESHBOOKS_CLIENT_SECRET, FRESHBOOKS_REFRESH_TOKEN");
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
