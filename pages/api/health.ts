import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Hit /api/health to see EXACTLY why Supabase calls fail (table missing,
// TLS/proxy, timeout, RLS). Always 200 so the JSON is easy to read.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const t = Date.now();
  const usingServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const { data, error } = await supabaseAdmin.from("agents").select("id").limit(1);
    if (error) return res.json({ ok: false, where: "query", error: error.message, code: error.code, hint: error.hint, usingServiceKey, ms: Date.now() - t });
    return res.json({ ok: true, sample_rows: data?.length ?? 0, usingServiceKey, ms: Date.now() - t });
  } catch (e: any) {
    return res.json({ ok: false, where: "fetch", error: e?.message || String(e), cause: e?.cause?.code || null, usingServiceKey, ms: Date.now() - t, hint: "Network/TLS to Supabase failed (corporate proxy? set NODE_TLS_REJECT_UNAUTHORIZED=0 for dev)" });
  }
}
