import { createClient } from '@supabase/supabase-js';
// At the top of /api/export-pdf.js, after your imports:
export const config = {
  maxDuration: 60, // seconds — increase to 120+ if you're on Pro
};

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);