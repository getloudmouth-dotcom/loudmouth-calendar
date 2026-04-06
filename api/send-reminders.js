// /api/send-reminders.js
// Vercel cron: runs every morning at 8 AM CST (14:00 UTC).
// Finds all scheduled_posts for today that haven't been emailed yet,
// groups them by user, sends one email per user via Resend, then marks rows sent.
//
// Protected by Authorization: Bearer <CRON_SECRET>
// Uses Supabase service role key to bypass RLS.

import { createClient } from "@supabase/supabase-js";

// ── Supabase admin client (service role, bypasses RLS) ──────────────────────
let _sbAdmin = null;
function getSupabaseAdmin() {
  if (_sbAdmin) return _sbAdmin;
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase URL or service role key. " +
        "Set VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  _sbAdmin = createClient(url, key, {
    auth: { persistSession: false },
  });
  return _sbAdmin;
}

// ── Send one email via Resend ────────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY env var.");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Loudmouth Calendar <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Build HTML email body for one user ──────────────────────────────────────
function buildEmailHtml(dateStr, rows) {
  const clientSections = rows
    .map((row) => {
      const types = (row.content_types || []).join(", ") || "Post";
      const links = (row.drive_links || []).filter(Boolean);
      const linkItems =
        links.length > 0
          ? links
              .map(
                (l, i) =>
                  `<li><a href="${escHtml(l)}" style="color:#1a1a2e;">${escHtml(l)}</a></li>`
              )
              .join("")
          : "<li><em>No drive links saved</em></li>";

      return `
        <div style="margin-bottom:24px;padding:16px;background:#f9f9f7;border-radius:8px;border:1px solid #e8e8e8;">
          <div style="font-weight:800;font-size:16px;color:#1a1a2e;margin-bottom:4px;">${escHtml(row.client_name)}</div>
          <div style="font-size:12px;color:#888;margin-bottom:10px;">Content type: ${escHtml(types)}</div>
          <div style="font-size:12px;font-weight:700;color:#555;margin-bottom:6px;">Content links:</div>
          <ul style="margin:0;padding-left:18px;font-size:13px;">${linkItems}</ul>
        </div>`;
    })
    .join("");

  return `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;color:#222;">
      <div style="background:#1a1a2e;padding:20px 28px;border-radius:10px 10px 0 0;">
        <span style="color:#D7FA06;font-weight:900;font-size:15px;letter-spacing:0.08em;">SMM CALENDAR CREATOR</span>
        <span style="color:rgba(255,255,255,0.35);font-size:9px;letter-spacing:0.06em;display:block;">by LOUDMOUTH CREATIVE</span>
      </div>
      <div style="background:white;padding:28px;border:1px solid #e8e8e8;border-top:none;border-radius:0 0 10px 10px;">
        <h2 style="margin:0 0 6px;font-size:20px;">Today's posting schedule</h2>
        <p style="margin:0 0 24px;color:#888;font-size:13px;">${escHtml(dateStr)}</p>
        ${clientSections}
        <p style="font-size:11px;color:#bbb;margin-top:24px;border-top:1px solid #f0f0f0;padding-top:12px;">
          You're receiving this because you scheduled posts in SMM Calendar Creator.
          To manage your schedule, log into the app.
        </p>
      </div>
    </div>`;
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Only allow GET (Vercel cron) or POST (manual trigger)
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth: require Bearer token matching CRON_SECRET
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization ?? "";
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const supabase = getSupabaseAdmin();

  // Today's date in YYYY-MM-DD (UTC — adjust if you want CST wall-clock date)
  const today = new Date().toISOString().slice(0, 10);

  // Fetch all unsent rows for today
  const { data: rows, error: fetchErr } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("post_date", today)
    .is("email_sent_at", null);

  if (fetchErr) {
    console.error("scheduled_posts fetch error:", fetchErr);
    return res.status(500).json({ error: fetchErr.message });
  }

  if (!rows || rows.length === 0) {
    return res.status(200).json({ sent: 0, message: "Nothing to send today." });
  }

  // Group rows by user_id
  const byUser = {};
  for (const row of rows) {
    (byUser[row.user_id] ??= []).push(row);
  }

  // Fetch email addresses for each user_id via auth.users (service role only)
  const userIds = Object.keys(byUser);
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error("auth.admin.listUsers error:", authErr);
    return res.status(500).json({ error: authErr.message });
  }

  const emailMap = {};
  for (const u of authUsers.users ?? []) {
    if (userIds.includes(u.id)) emailMap[u.id] = u.email;
  }

  // Format today nicely for the email subject/body
  const dateStr = new Date(today + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  let sentCount = 0;
  const sentIds = [];
  const errors = [];

  for (const [userId, userRows] of Object.entries(byUser)) {
    const email = emailMap[userId];
    if (!email) {
      errors.push({ userId, error: "No email found" });
      continue;
    }

    try {
      await sendEmail({
        to: email,
        subject: `Posting reminder: ${userRows.length} client${userRows.length > 1 ? "s" : ""} today`,
        html: buildEmailHtml(dateStr, userRows),
      });
      sentCount++;
      sentIds.push(...userRows.map((r) => r.id));
    } catch (e) {
      console.error(`Email failed for ${email}:`, e);
      errors.push({ userId, email, error: e.message });
    }
  }

  // Mark sent rows so they never get emailed again
  if (sentIds.length > 0) {
    const { error: updateErr } = await supabase
      .from("scheduled_posts")
      .update({ email_sent_at: new Date().toISOString() })
      .in("id", sentIds);

    if (updateErr) {
      console.error("Failed to mark rows as sent:", updateErr);
      // Don't fail — emails went out, just log the issue
    }
  }

  return res.status(200).json({
    today,
    sent: sentCount,
    rowsProcessed: rows.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
