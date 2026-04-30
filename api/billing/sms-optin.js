// POST /api/billing/sms-optin
// Generates a one-time opt-in token and sends a confirmation email to the client via Resend.
// Auth: admin JWT required.

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { withSentry } from '../_sentry.js';

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function sendEmail({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: "Loudmouth HQ <reminders@getloudmouth.work>", to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Resend error ${res.status}`);
  }
}

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing auth token" });

  const sbAdmin = getSupabaseAdmin();
  const { data: { user }, error: authError } = await sbAdmin.auth.getUser(authHeader.slice(7));
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { data: caller } = await sbAdmin.from("profiles").select("role, status").eq("id", user.id).single();
  if (caller?.role !== "admin" || caller?.status !== "active") return res.status(403).json({ error: "Admin access required" });

  const { client_id } = req.body;
  if (!client_id) return res.status(400).json({ error: "client_id is required" });

  const { data: client, error: clientError } = await sbAdmin.from("clients").select("id, name, email, sms_consent_at").eq("id", client_id).single();
  if (clientError || !client) return res.status(404).json({ error: "Client not found" });
  if (!client.email) return res.status(400).json({ error: "Client has no email address" });
  if (client.sms_consent_at) return res.status(400).json({ error: "Client is already opted in" });

  const token = randomUUID();
  await sbAdmin.from("clients").update({ sms_optin_token: token }).eq("id", client_id);

  const siteUrl = process.env.SITE_URL || "https://getloudmouth.work";
  const confirmUrl = `${siteUrl}/api/billing/sms-optin-confirm?token=${token}`;
  const firstName = (client.name || "there").split(" ")[0];

  await sendEmail({
    to: client.email,
    subject: "Confirm SMS notifications from Loudmouth",
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#fff;">
        <div style="font-weight:900;font-size:16px;letter-spacing:0.08em;color:#1a1a2e;margin-bottom:24px;">LOUDMOUTH HQ</div>
        <h2 style="font-size:20px;font-weight:800;color:#111;margin:0 0 12px;">Hi ${firstName},</h2>
        <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">
          Loudmouth would like to send you SMS notifications for invoices, billing updates, and content review links related to your account.
        </p>
        <a href="${confirmUrl}" style="display:inline-block;background:#1a1a2e;color:#D7FA06;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:800;font-size:14px;letter-spacing:0.04em;">
          Confirm SMS Notifications →
        </a>
        <p style="font-size:12px;color:#aaa;margin:24px 0 0;line-height:1.6;">
          You can opt out at any time by replying <strong>STOP</strong> to any message.<br/>
          If you did not expect this email, you can safely ignore it.
        </p>
      </div>
    `,
  });

  return res.status(200).json({ ok: true });
}

export default withSentry(handler);
