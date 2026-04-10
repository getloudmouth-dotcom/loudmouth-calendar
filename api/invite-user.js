// /api/invite-user.js
// POST body: { email, name, role, job_title }
// Authorization: Bearer <user JWT>
// Caller must be an admin. Uses Supabase service role to send the invite.

import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing auth token" });

  const token = authHeader.slice(7);
  const sbAdmin = getSupabaseAdmin();

  // Verify the caller's JWT and that they're an admin
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
  if (!["admin", "smm", "designer", "client"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const redirectTo = `${process.env.SITE_URL || "https://app.getloudmouth.us"}`;

  const { data, error } = await sbAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      display_name: name,
      role,
      job_title,
      invited_by: user.id,
    },
  });

  if (error) return res.status(400).json({ error: error.message });

  return res.status(200).json({ success: true, user_id: data.user?.id });
}
