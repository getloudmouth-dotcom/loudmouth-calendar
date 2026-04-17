// /api/delete-user.js
// POST body: { userId }
// Authorization: Bearer <admin JWT>
// Deletes a user's auth account, profile, and tool access. Admins only. Cannot delete self.

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

  const { data: { user: caller }, error: authError } = await sbAdmin.auth.getUser(token);
  if (authError || !caller) return res.status(401).json({ error: "Invalid token" });

  const { data: callerProfile } = await sbAdmin
    .from("profiles")
    .select("role, status")
    .eq("id", caller.id)
    .single();

  if (callerProfile?.role !== "admin" || callerProfile?.status !== "active") {
    return res.status(403).json({ error: "Forbidden — admin access required" });
  }

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required" });
  if (userId === caller.id) return res.status(400).json({ error: "You cannot delete your own account" });

  // Clean up related data, then delete the auth user (profile may cascade, but be explicit)
  await sbAdmin.from("user_tool_access").delete().eq("user_id", userId);
  await sbAdmin.from("profiles").delete().eq("id", userId);

  const { error: deleteError } = await sbAdmin.auth.admin.deleteUser(userId);
  if (deleteError) return res.status(500).json({ error: deleteError.message });

  return res.status(200).json({ success: true });
}
