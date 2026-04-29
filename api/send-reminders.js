// /api/send-reminders.js
// Vercel cron: runs daily at 14:00 UTC.
//   → 9:00 AM CDT (UTC-5, Mar–Nov)  ✓ target
//   → 8:00 AM CST (UTC-6, Nov–Mar)  — 1 hr early in winter; Vercel cron has no DST support
//
// "today" is computed in America/Chicago wall-clock time so post_date matching
// is always correct regardless of UTC offset.
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
async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY env var.");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Build per-post cards for a single scheduled_posts row ───────────────────
function buildPostCards(dayPosts, fallbackLinks) {
  if (!dayPosts || dayPosts.length === 0) {
    // Graceful fallback: show drive links as before
    const links = (fallbackLinks || []).filter(Boolean);
    if (links.length === 0) return `<p style="font-size:13px;color:#888;margin:0;"><em>No content links saved</em></p>`;
    return links
      .map((l) => `<a href="${escHtml(l)}" style="display:block;font-size:12px;color:#4f46e5;word-break:break-all;margin-bottom:4px;">${escHtml(l)}</a>`)
      .join("");
  }

  return dayPosts
    .map((post) => {
      const imageUrl = (post.imageUrls && post.imageUrls[0]) || "";
      const caption = (post.caption || "").trim();
      const contentType = post.contentType || "Post";
      // Collect all links for this post
      const postLinks = [];
      if (post.url) postLinks.push(post.url);
      if (post.videoUrl) postLinks.push(post.videoUrl);
      if (Array.isArray(post.urls)) postLinks.push(...post.urls.filter(Boolean));

      const thumbHtml = imageUrl
        ? `<img src="${escHtml(imageUrl)}" width="120" height="120" style="border-radius:8px;object-fit:cover;display:block;margin-bottom:12px;" />`
        : "";

      const captionHtml = caption
        ? `<p style="font-size:13px;color:#374151;margin:8px 0 8px;line-height:1.5;">${escHtml(caption)}</p>`
        : "";

      const linksHtml = postLinks.length > 0
        ? `<div style="margin-top:6px;">${postLinks
            .map((l) => `<a href="${escHtml(l)}" style="display:block;font-size:12px;color:#4f46e5;word-break:break-all;margin-bottom:4px;">${escHtml(l)}</a>`)
            .join("")}</div>`
        : "";

      return `
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:12px;">
          ${thumbHtml}
          <span style="display:inline-block;background:#D7FA06;color:#1a1a2e;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:0.04em;">${escHtml(contentType)}</span>
          ${captionHtml}
          ${linksHtml}
        </div>`;
    })
    .join("");
}

// ── Build HTML email body for one user ──────────────────────────────────────
function buildEmailHtml(dateStr, rows, userName, postsByRowId) {
  const greeting = userName
    ? `<p style="font-size:18px;font-weight:700;color:#1a1a2e;margin:0 0 4px;">Good morning, ${escHtml(userName)}! ☀️</p>`
    : `<p style="font-size:18px;font-weight:700;color:#1a1a2e;margin:0 0 4px;">Good morning! ☀️</p>`;

  const clientSections = rows
    .map((row) => {
      const dayPosts = postsByRowId ? postsByRowId[row.id] : null;
      const postCardsHtml = buildPostCards(dayPosts, row.drive_links);

      return `
        <div style="margin-bottom:24px;padding:16px;background:#f9f9f7;border-radius:8px;border:1px solid #e8e8e8;">
          <div style="font-weight:800;font-size:16px;color:#1a1a2e;margin-bottom:12px;">${escHtml(row.client_name)}</div>
          ${postCardsHtml}
        </div>`;
    })
    .join("");

  return `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;color:#222;">
      <div style="background:#1a1a2e;padding:20px 28px;border-radius:10px 10px 0 0;">
        <span style="color:#D7FA06;font-weight:900;font-size:15px;letter-spacing:0.08em;">LOUDMOUTH HQ</span>
        <span style="color:rgba(255,255,255,0.35);font-size:9px;letter-spacing:0.06em;display:block;">by Loudmouth</span>
      </div>
      <div style="background:white;padding:28px;border:1px solid #e8e8e8;border-top:none;border-radius:0 0 10px 10px;">
        ${greeting}
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

function buildEmailText(dateStr, rows, userName, postsByRowId) {
  const greeting = userName ? `Good morning, ${userName}!\n\n` : "";
  const sections = rows
    .map((row) => {
      const dayPosts = postsByRowId ? postsByRowId[row.id] : null;
      if (dayPosts && dayPosts.length > 0) {
        const postLines = dayPosts
          .map((post, i) => {
            const type = post.contentType || "Post";
            const caption = (post.caption || "").trim();
            const links = [];
            if (post.url) links.push(post.url);
            if (post.videoUrl) links.push(post.videoUrl);
            if (Array.isArray(post.urls)) links.push(...post.urls.filter(Boolean));
            return [
              `Post ${i + 1} (${type})`,
              caption ? `Caption: ${caption}` : "",
              links.length > 0 ? `Link: ${links.join(", ")}` : "",
            ].filter(Boolean).join("\n");
          })
          .join("\n\n");
        return `${row.client_name}\n${postLines}`;
      }
      const links = (row.drive_links || []).filter(Boolean);
      const linkLines = links.length > 0 ? links.join("\n") : "No drive links saved";
      return `${row.client_name}\nLinks:\n${linkLines}`;
    })
    .join("\n\n---\n\n");

  return `LOUDMOUTH HQ — Today's posting schedule\n${dateStr}\n\n${greeting}${sections}\n\nYou're receiving this because you scheduled posts in Loudmouth HQ.`;
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
  // Only allow GET (Vercel cron) or POST (manual trigger / test)
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Test mode: POST with { rowId } + user JWT sends a single-row test email ──
  if (req.method === "POST" && req.body?.rowId) {
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Missing token" });

    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "Invalid token" });

    const { data: row, error: rowErr } = await supabase
      .from("scheduled_posts")
      .select("*")
      .eq("id", req.body.rowId)
      .single();
    if (rowErr || !row) return res.status(404).json({ error: "Row not found" });
    if (row.user_id !== user.id) return res.status(403).json({ error: "Forbidden" });

    const { data: authUsers, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) return res.status(500).json({ error: listErr.message });
    const authUser = authUsers.users?.find((u) => u.id === user.id);
    if (!authUser?.email) return res.status(400).json({ error: "No email found for user" });

    // Fetch user profile for greeting
    const { data: profileData } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();
    const userName = profileData?.name || "";

    // Fetch latest draft for this calendar to get per-post data
    const day = parseInt((row.post_date || "").split("-")[2] || "1", 10);
    const { data: draftData } = await supabase
      .from("calendar_drafts")
      .select("posts")
      .eq("calendar_id", row.calendar_id)
      .order("saved_at", { ascending: false })
      .limit(1)
      .single();
    const postsByRowId = { [row.id]: draftData?.posts?.[day] || [] };

    const dateStr = new Date((row.post_date || new Date().toISOString().slice(0, 10)) + "T12:00:00Z").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });

    const testHtml = buildEmailHtml(dateStr, [row], userName, postsByRowId).replace(
      "<h2",
      `<div style="display:inline-block;background:#fff8d0;border:1px solid #f0d000;color:#7a6000;font-size:11px;font-weight:700;border-radius:4px;padding:3px 8px;margin-bottom:16px;">TEST EMAIL — not a real reminder</div><h2`
    );

    await sendEmail({
      to: authUser.email,
      subject: `[TEST] Posting reminder: ${row.client_name}`,
      html: testHtml,
      text: `[TEST EMAIL]\n${buildEmailText(dateStr, [row], userName, postsByRowId)}`,
    });

    return res.status(200).json({ ok: true, sentTo: authUser.email });
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

  // Use Central Time wall-clock date so post_date matching is always correct
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });

  // Fetch all unsent rows for today
  const { data: rows, error: fetchErr } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("post_date", today)
    .is("email_sent_at", null)
    .eq("notify", true);

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

  // Fetch profiles for greeting names
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", userIds);
  const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

  // Fetch latest calendar_drafts for all calendars in today's rows
  const calendarIds = [...new Set(rows.map((r) => r.calendar_id))];
  const { data: drafts } = await supabase
    .from("calendar_drafts")
    .select("calendar_id, posts, saved_at")
    .in("calendar_id", calendarIds)
    .order("saved_at", { ascending: false });
  const latestDraftMap = {};
  for (const d of drafts || []) {
    if (!latestDraftMap[d.calendar_id]) latestDraftMap[d.calendar_id] = d;
  }

  // Build postsByRowId: map each scheduled_posts row id → array of draft post objects
  const postsByRowId = {};
  for (const row of rows) {
    const day = parseInt(row.post_date.split("-")[2], 10);
    postsByRowId[row.id] = latestDraftMap[row.calendar_id]?.posts?.[day] || [];
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

    const userName = profileMap[userId]?.name || "";

    try {
      await sendEmail({
        to: email,
        subject: `Posting reminder: ${userRows.length} client${userRows.length > 1 ? "s" : ""} today`,
        html: buildEmailHtml(dateStr, userRows, userName, postsByRowId),
        text: buildEmailText(dateStr, userRows, userName, postsByRowId),
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
