import { createClient } from "@supabase/supabase-js";

// Server-side client. Uses the service-role key if provided (bypasses RLS);
// otherwise falls back to the publishable key (works with the demo RLS policies).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabaseAdmin = createClient(url, key, { auth: { persistSession: false } });
