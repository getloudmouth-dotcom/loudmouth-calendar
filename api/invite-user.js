// /api/invite-user.js
// POST body: { email, name, role, job_title }
// Authorization: Bearer <user JWT>
// Caller must be an admin. Generates a Supabase invite link, then sends a
// custom branded email via Resend (no Supabase mailer involved).

import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function buildInviteEmail(name, inviteUrl) {
  const displayName = name ? name.split(" ")[0] : "you";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're invited to Loudmouth</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:40px;">
              <span style="font-size:28px;font-weight:900;letter-spacing:-1px;color:#1a1a2e;">LOUDMOUTH</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#1a1a2e;border-radius:16px;padding:48px 40px;">

              <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#D7FA06;">
                You're invited
              </p>

              <h1 style="margin:0 0 20px;font-size:32px;font-weight:800;line-height:1.2;color:#ffffff;">
                Someone thinks you're kind of a big deal.
              </h1>

              <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:rgba(255,255,255,0.6);">
                Hey ${displayName} — you've been officially added to the Loudmouth crew.
                Click the button below, set your password, and let's get to work.
                (We're not a cult. Probably.)
              </p>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="border-radius:10px;background:#D7FA06;">
                    <a href="${inviteUrl}"
                       style="display:inline-block;padding:16px 36px;font-size:16px;font-weight:800;color:#1a1a2e;text-decoration:none;letter-spacing:0.04em;">
                      Accept Your Invite →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.35);line-height:1.5;">
                This invite expires in <strong style="color:rgba(255,255,255,0.55);">24 hours</strong>.
                Don't ghost us — we'll know.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="margin:0;font-size:12px;color:#999999;">
                Sent by The Loudmouth Team &nbsp;·&nbsp;
                <a href="https://getloudmouth.work" style="color:#777777;text-decoration:none;">getloudmouth.work</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendInviteEmail(email, name, inviteUrl) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "The Loudmouth Team <team@getloudmouth.work>",
      to: [email],
      subject: "You're in. Welcome to Loudmouth 🎤",
      html: buildInviteEmail(name, inviteUrl),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing auth token" });

  const token = authHeader.slice(7);
  const sbAdmin = getSupabaseAdmin();

  const { data: { user }, error: authError } = await sbAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { data: callerProfile } = await sbAdmin
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin" || callerProfile?.status !== "active") {
    return res.status(403).json({ error: "Forbidden — admin access required" });
  }

  const { email, name = "", role = "smm", job_title = "" } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });
  if (!["admin", "smm", "graphic_designer", "content_creator", "videographer", "video_editor", "public_relations", "account_manager"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const redirectTo = "https://getloudmouth.work";

  const { data, error } = await sbAdmin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo,
      data: {
        display_name: name,
        role,
        job_title,
        invited_by: user.id,
      },
    },
  });

  if (error) return res.status(400).json({ error: error.message });

  const inviteUrl = data.properties?.action_link;
  if (!inviteUrl) return res.status(500).json({ error: "Failed to generate invite link" });

  try {
    await sendInviteEmail(email, name, inviteUrl);
  } catch (emailErr) {
    return res.status(500).json({ error: emailErr.message });
  }

  return res.status(200).json({ success: true, user_id: data.user?.id });
}
