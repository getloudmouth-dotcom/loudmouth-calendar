// /api/share-calendar.js
// POST body: { calendarId, collaboratorEmail, permission }
// Authorization: Bearer <user JWT>
// Caller must be the calendar owner. Adds a collaborator and sends an email notification.

import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Loudmouth HQ <hello@posting.getloudmouth.us>",
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
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing auth token" });

  const token = authHeader.slice(7);
  const sbAdmin = getSupabaseAdmin();

  // Verify the caller
  const { data: { user }, error: authError } = await sbAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { calendarId, collaboratorEmail, permission = "editor" } = req.body;
  if (!calendarId || !collaboratorEmail) {
    return res.status(400).json({ error: "calendarId and collaboratorEmail are required" });
  }
  if (!["viewer", "editor"].includes(permission)) {
    return res.status(400).json({ error: "permission must be viewer or editor" });
  }

  // Verify caller owns this calendar
  const { data: calendar, error: calErr } = await sbAdmin
    .from("calendars")
    .select("id, client_name, user_id")
    .eq("id", calendarId)
    .single();

  if (calErr || !calendar) return res.status(404).json({ error: "Calendar not found" });
  if (calendar.user_id !== user.id) return res.status(403).json({ error: "You do not own this calendar" });

  // Look up collaborator's profile by email
  const { data: collaboratorProfile } = await sbAdmin
    .from("profiles")
    .select("id, name, email")
    .eq("email", collaboratorEmail)
    .single();

  if (!collaboratorProfile) {
    return res.status(404).json({ error: "No user found with that email. They must be invited to the system first." });
  }

  if (collaboratorProfile.id === user.id) {
    return res.status(400).json({ error: "You cannot add yourself as a collaborator." });
  }

  // Upsert collaborator (update permission if already exists)
  const { error: insertErr } = await sbAdmin
    .from("calendar_collaborators")
    .upsert(
      { calendar_id: calendarId, user_id: collaboratorProfile.id, added_by: user.id, permission },
      { onConflict: "calendar_id,user_id" }
    );

  if (insertErr) return res.status(500).json({ error: insertErr.message });

  // Look up sharer's name
  const { data: sharerProfile } = await sbAdmin
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  const sharerName = sharerProfile?.name || "Someone";
  const siteUrl = process.env.SITE_URL || "https://getloudmouth.work";

  // Send email notification
  try {
    await sendEmail({
      to: collaboratorProfile.email,
      subject: `${sharerName} shared a calendar with you`,
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
          <div style="font-weight:900;font-size:16px;letter-spacing:0.08em;color:#1a1a2e;margin-bottom:4px">LOUDMOUTH HQ</div>
          <div style="font-size:11px;color:#aaa;letter-spacing:0.06em;margin-bottom:28px">by Loudmouth</div>
          <p style="font-size:15px;color:#222;margin-bottom:8px">Hi ${collaboratorProfile.name || collaboratorProfile.email},</p>
          <p style="font-size:14px;color:#444;line-height:1.6">
            <strong>${sharerName}</strong> has shared the <strong>${calendar.client_name}</strong> calendar with you as a <strong>${permission}</strong>.
          </p>
          <div style="margin:28px 0">
            <a href="${siteUrl}" style="background:#1a1a2e;color:#D7FA06;padding:12px 28px;border-radius:8px;font-weight:800;font-size:14px;text-decoration:none;letter-spacing:0.04em">Open Calendar →</a>
          </div>
          <p style="font-size:12px;color:#aaa">Log in with your existing account to view the shared calendar.</p>
        </div>
      `,
    });
  } catch (emailErr) {
    // Don't fail the whole request if email fails — collaborator was added successfully
    console.error("Share email failed:", emailErr.message);
  }

  return res.status(200).json({ success: true, collaborator: { id: collaboratorProfile.id, name: collaboratorProfile.name, email: collaboratorProfile.email, permission } });
}
