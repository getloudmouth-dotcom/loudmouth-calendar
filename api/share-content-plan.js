// /api/share-content-plan.js
// POST body: { planId, recipientEmail }
// Authorization: Bearer <user JWT>
// Upserts a share token for the plan and sends the public link via email.

import { createClient } from "@supabase/supabase-js";

let _supabaseCache = { url: "", key: "", client: null };
function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or service key");
  if (_supabaseCache.client && _supabaseCache.url === url && _supabaseCache.key === key) return _supabaseCache.client;
  _supabaseCache = { url, key, client: createClient(url, key, { auth: { persistSession: false } }) };
  return _supabaseCache.client;
}

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Loudmouth Calendar <reminders@loudmouthcalendar.com>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error: ${body}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing auth token" });

  const token = authHeader.slice(7);
  const sb = getSupabaseAdmin();

  const { data: { user }, error: authError } = await sb.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { planId, recipientEmail } = req.body || {};
  if (!planId || !recipientEmail) {
    return res.status(400).json({ error: "planId and recipientEmail are required" });
  }

  // Verify caller owns this plan
  const { data: plan, error: planErr } = await sb
    .from("content_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (planErr || !plan) return res.status(404).json({ error: "Plan not found" });
  if (plan.user_id !== user.id) return res.status(403).json({ error: "You do not own this plan" });

  // Upsert share token (one per plan)
  const { data: share, error: shareErr } = await sb
    .from("content_plan_shares")
    .upsert({ plan_id: planId, allow_client_notes: true }, { onConflict: "plan_id" })
    .select()
    .single();

  if (shareErr) return res.status(500).json({ error: shareErr.message });

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const siteUrl = process.env.SITE_URL || process.env.APP_URL || "https://loudmouthcalendar.com";
  const publicUrl = `${siteUrl}/?contentPlanToken=${share.token}`;

  // Look up sender's name
  const { data: senderProfile } = await sb.from("profiles").select("name").eq("id", user.id).single();
  const senderName = senderProfile?.name || "Your team";

  try {
    await sendEmail({
      to: recipientEmail,
      subject: `${senderName} shared a content plan with you`,
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
          <div style="font-weight:900;font-size:16px;letter-spacing:0.08em;color:#1a1a2e;margin-bottom:4px">CONTENT PLAN</div>
          <div style="font-size:11px;color:#aaa;letter-spacing:0.06em;margin-bottom:28px">by LOUDMOUTH CREATIVE</div>
          <p style="font-size:15px;color:#222;margin-bottom:8px">Hi there,</p>
          <p style="font-size:14px;color:#444;line-height:1.6">
            <strong>${senderName}</strong> has shared the <strong>${plan.client_name}</strong> content plan for
            <strong>${MONTHS[plan.month]} ${plan.year}</strong> with you for review.
          </p>
          <p style="font-size:13px;color:#666;line-height:1.6">You can review each item, approve or deny, and add notes — no login required.</p>
          <div style="margin:28px 0">
            <a href="${publicUrl}" style="background:#1a1a2e;color:#D7FA06;padding:12px 28px;border-radius:8px;font-weight:800;font-size:14px;text-decoration:none;letter-spacing:0.04em">View Content Plan →</a>
          </div>
          <p style="font-size:11px;color:#aaa">This link is unique to you. No account needed.</p>
        </div>
      `,
    });
  } catch (emailErr) {
    console.error("Share email failed:", emailErr.message);
    // Return the URL even if email fails so client can copy it
    return res.status(200).json({ success: true, url: publicUrl, emailError: emailErr.message });
  }

  return res.status(200).json({ success: true, url: publicUrl });
}
