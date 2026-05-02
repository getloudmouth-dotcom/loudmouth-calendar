// GET /api/billing/sms-optin-confirm?token=xxx
// Public endpoint — clicked from the client's confirmation email.
// Sets sms_consent_at and clears the one-time token.

import { createClient } from "@supabase/supabase-js";
import { withSentry } from '../_sentry.js';

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { token } = req.query;
  if (!token) return res.status(400).send(errorPage("Missing confirmation token."));

  const sbAdmin = getSupabaseAdmin();
  const { data: client, error } = await sbAdmin
    .from("clients")
    .select("id, name, sms_consent_at")
    .eq("sms_optin_token", token)
    .single();

  if (error || !client) return res.status(404).send(errorPage("This confirmation link is invalid or has already been used."));
  if (client.sms_consent_at) return res.status(200).send(successPage("You're already confirmed! You'll continue to receive SMS notifications from Loudmouth."));

  await sbAdmin.from("clients").update({
    sms_consent_at: new Date().toISOString(),
    sms_optin_token: null,
  }).eq("id", client.id);

  res.setHeader("Content-Type", "text/html");
  return res.status(200).send(successPage(`Thanks, ${(client.name || "").split(" ")[0] || "there"}! You're confirmed.`));
}

function successPage(message) {
  return page("#4ade80", "Confirmed!", message, "You'll receive SMS notifications from Loudmouth for invoices, billing updates, and content review links. Reply <strong>STOP</strong> to any message to opt out at any time.");
}

function errorPage(message) {
  return page("#E8001C", "Something went wrong", message, "Please contact your Loudmouth account manager if you need help.");
}

function page(accentColor, heading, subheading, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Loudmouth SMS</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Helvetica Neue',Arial,sans-serif;background:#1a1a2e;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}</style>
</head>
<body>
  <div style="background:#fff;border-radius:16px;padding:48px 40px;max-width:420px;width:100%;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,0.4)">
    <div style="font-weight:900;font-size:15px;letter-spacing:0.08em;color:#1a1a2e;margin-bottom:32px">LOUDMOUTH HQ</div>
    <div style="font-size:36px;margin-bottom:16px">${accentColor === "#4ade80" ? "✓" : "✕"}</div>
    <h1 style="font-size:22px;font-weight:800;color:#111;margin-bottom:8px">${heading}</h1>
    <p style="font-size:14px;color:#555;margin-bottom:16px;font-weight:600">${subheading}</p>
    <p style="font-size:13px;color:#888;line-height:1.6">${body}</p>
  </div>
</body>
</html>`;
}

export default withSentry(handler);
