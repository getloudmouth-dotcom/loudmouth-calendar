// /api/share-content-plan.js
// POST body: { planId, method: 'email' | 'sms' | 'both' }
// Authorization: Bearer <user JWT>
// Upserts a share token and delivers the public link via email, SMS, or both.

import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";

let _sbCache = { url: "", key: "", client: null };
function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or service key");
  if (_sbCache.client && _sbCache.url === url && _sbCache.key === key) return _sbCache.client;
  _sbCache = { url, key, client: createClient(url, key, { auth: { persistSession: false } }) };
  return _sbCache.client;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Loudmouth HQ <reminders@getloudmouth.work>",
      to,
      subject,
      html,
      text,
      headers: {
        "List-Unsubscribe": `<mailto:unsubscribe@getloudmouth.work?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });
  if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
}

async function sendSms({ to, body }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !from) throw new Error("Missing Twilio credentials");
  const client = twilio(accountSid, authToken);
  await client.messages.create({ to, from, body });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing auth token" });

  const token = authHeader.slice(7);
  const sb = getSupabaseAdmin();

  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { planId, method = "email" } = req.body || {};
  if (!planId) return res.status(400).json({ error: "planId is required" });
  if (!["email", "sms", "both"].includes(method)) return res.status(400).json({ error: "method must be email, sms, or both" });

  // Verify caller owns this plan and fetch linked client
  const { data: plan, error: planErr } = await sb
    .from("content_plans")
    .select("*, clients(id, name, email, phone)")
    .eq("id", planId)
    .single();

  if (planErr || !plan) return res.status(404).json({ error: "Plan not found" });
  if (plan.user_id !== user.id) return res.status(403).json({ error: "You do not own this plan" });

  const client = plan.clients;
  if ((method === "email" || method === "both") && !client?.email) {
    return res.status(400).json({ error: "Client has no email address on file" });
  }
  if ((method === "sms" || method === "both") && !client?.phone) {
    return res.status(400).json({ error: "Client has no phone number on file" });
  }

  // Upsert share token (one per plan)
  const { data: share, error: shareErr } = await sb
    .from("content_plan_shares")
    .upsert({ plan_id: planId, allow_client_notes: true }, { onConflict: "plan_id" })
    .select()
    .single();

  if (shareErr) return res.status(500).json({ error: shareErr.message });

  const siteUrl = process.env.SITE_URL || process.env.APP_URL || "https://getloudmouth.work";
  const publicUrl = `${siteUrl}/?contentPlanToken=${share.token}`;
  const monthName = MONTHS[plan.month];

  const { data: senderProfile } = await sb.from("profiles").select("name").eq("id", user.id).single();
  const senderName = senderProfile?.name || "Your team";

  const errors = [];

  if (method === "email" || method === "both") {
    try {
      await sendEmail({
        to: client.email,
        subject: `${senderName} shared a content plan with you`,
        text: `${senderName} has shared the ${plan.client_name} content plan for ${monthName} ${plan.year} with you.\n\nReview it here (no login required):\n${publicUrl}\n\nYou can approve, deny, and add notes on each item.`,
        html: `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
            <div style="font-weight:900;font-size:16px;letter-spacing:0.08em;color:#1a1a2e;margin-bottom:4px">CONTENT PLAN</div>
            <div style="font-size:11px;color:#aaa;letter-spacing:0.06em;margin-bottom:28px">by Loudmouth</div>
            <p style="font-size:15px;color:#222;margin-bottom:8px">Hi there,</p>
            <p style="font-size:14px;color:#444;line-height:1.6">
              <strong>${senderName}</strong> has shared the <strong>${plan.client_name}</strong> content plan for
              <strong>${monthName} ${plan.year}</strong> with you for review.
            </p>
            <p style="font-size:13px;color:#666;line-height:1.6">You can review each item, approve or deny, and add notes — no login required.</p>
            <div style="margin:28px 0">
              <a href="${publicUrl}" style="background:#1a1a2e;color:#D7FA06;padding:12px 28px;border-radius:8px;font-weight:800;font-size:14px;text-decoration:none;letter-spacing:0.04em">View Content Plan →</a>
            </div>
            <p style="font-size:11px;color:#aaa">This link is unique to you. No account needed.</p>
          </div>
        `,
      });
    } catch (e) {
      errors.push(`Email: ${e.message}`);
    }
  }

  if (method === "sms" || method === "both") {
    try {
      await sendSms({
        to: client.phone,
        body: `Loudmouth Creative\nYour ${monthName} ${plan.year} content plan is ready for review.\n${publicUrl}\n\nReply STOP to opt out.`,
      });
    } catch (e) {
      errors.push(`SMS: ${e.message}`);
    }
  }

  if (errors.length > 0 && (method !== "both" || errors.length === 2)) {
    return res.status(200).json({ success: false, url: publicUrl, errors });
  }

  return res.status(200).json({ success: true, url: publicUrl, partialErrors: errors.length ? errors : undefined });
}
