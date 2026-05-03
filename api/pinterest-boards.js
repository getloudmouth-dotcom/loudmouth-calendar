import { withSentry } from './_sentry.js';
// Pinterest API v5 — authenticated board/pin listing + OAuth token exchange

const PINTEREST_TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";
const PINTEREST_API = "https://api.pinterest.com/v5";

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { action, boardId, token, code, verifier, redirect_uri } = req.query;

  if (action === "exchange") {
    // Exchange OAuth code for access token (PKCE flow)
    if (!code || !verifier) return res.status(400).json({ error: "Missing code or verifier" });
    if (!redirect_uri) return res.status(400).json({ error: "Missing redirect_uri" });

    const clientId = process.env.PINTEREST_CLIENT_ID;
    const clientSecret = process.env.PINTEREST_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.status(503).json({ error: "Pinterest app not configured on server" });
    }

    // Validate redirect_uri against an allow-list to prevent open-redirect-style abuse.
    // Must end with the callback path AND be on either APP_URL or local dev origin.
    const allowedOrigins = [process.env.APP_URL, "http://localhost:5173"].filter(Boolean);
    const isAllowed =
      redirect_uri.endsWith("/pinterest-callback.html") &&
      allowedOrigins.some(origin => redirect_uri === `${origin}/pinterest-callback.html`);
    if (!isAllowed) return res.status(400).json({ error: "Invalid redirect_uri" });

    const redirectUri = redirect_uri;
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    });

    const resp = await fetch(PINTEREST_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: body.toString(),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("Pinterest token exchange failed:", data);
      return res.status(400).json({ error: "Pinterest login failed. Please try again." });
    }

    return res.status(200).json({ access_token: data.access_token });
  }

  // Fall back to a server-configured default token (single-account mode) when the
  // client doesn't supply one. Lets us ship without the full OAuth dance for now.
  const effectiveToken =
    token && token !== "default" ? token : process.env.PINTEREST_DEFAULT_TOKEN;
  if (!effectiveToken) return res.status(400).json({ error: "Missing token" });

  const authHeaders = { Authorization: `Bearer ${effectiveToken}`, "Content-Type": "application/json" };

  if (action === "boards") {
    const resp = await fetch(`${PINTEREST_API}/boards?page_size=50`, { headers: authHeaders });
    if (resp.status === 401) return res.status(401).json({ error: "token_expired" });
    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: data.message || "Failed to load boards" });

    const boards = (data.items || []).map(b => ({
      id: b.id,
      name: b.name,
      description: b.description || "",
      cover_url: b.media?.image_cover_url || null,
      pin_count: b.pin_count || 0,
    }));

    return res.status(200).json({ boards });
  }

  if (action === "pins") {
    if (!boardId) return res.status(400).json({ error: "Missing boardId" });

    const resp = await fetch(
      `${PINTEREST_API}/boards/${boardId}/pins?page_size=50&fields=id%2Ctitle%2Cdescription%2Cmedia`,
      { headers: authHeaders }
    );
    if (resp.status === 401) return res.status(401).json({ error: "token_expired" });
    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: data.message || "Failed to load pins" });

    const pins = (data.items || [])
      .map(p => {
        const imgs = p.media?.images || {};
        const image_url = imgs["736x"]?.url || imgs["600x"]?.url || imgs["474x"]?.url || imgs["236x"]?.url;
        if (!image_url) return null;
        return { id: p.id, title: p.title || p.description || "", image_url };
      })
      .filter(Boolean);

    return res.status(200).json({ pins });
  }

  return res.status(400).json({ error: "Unknown action" });
}

export default withSentry(handler);
