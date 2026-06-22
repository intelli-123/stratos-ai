import { createClient } from "@supabase/supabase-js";

// Server-side client. Uses the service-role key if provided (bypasses RLS);
// otherwise falls back to the publishable key (works with the demo RLS policies).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Fail fast (don't stall ~30s) so problems surface as a clear timeout error.
const timeoutFetch: typeof fetch = (input, init) => {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), 8000);
  return fetch(input as any, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(id));
};

export const supabaseAdmin = createClient(url, key, {
  auth: { persistSession: false },
  global: { fetch: timeoutFetch },
});
