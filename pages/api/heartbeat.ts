import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Lightweight liveness ping from the SDK. Keeps an agent "online" while its
// process is up, even when it isn't actively serving LLM queries. Resolves the
// agent by enrollment token and bumps last_seen (+ flips status online).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).end(); }
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase connection is not initialized. Please verify that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set." });
    }

    const token = (req.headers["x-stratos-token"] as string) || (req.headers["x-aether-token"] as string) || "";
    if (!token) return res.status(400).json({ error: "missing x-aether-token" });
    const { data: t } = await supabaseAdmin.from("enroll_tokens").select("agent_id").eq("token", token).maybeSingle();
    if (!t?.agent_id) return res.status(404).json({ error: "unknown token" });

    // SDK-detected metadata (framework/model/tools) rides on the heartbeat, so the
    // dashboard auto-fills these instead of relying on manual input or span quality.
    const body = req.body || {};
    const patch: Record<string, any> = { status: "online", last_seen: new Date().toISOString() };
    if (body.framework) patch.framework = String(body.framework);
    if (body.model) patch.model = String(body.model);
    if (Array.isArray(body.tools) && body.tools.length) {
      const { data: cur } = await supabaseAdmin.from("agents").select("tools").eq("id", t.agent_id).maybeSingle();
      patch.tools = Array.from(new Set([...((cur?.tools as string[]) || []), ...body.tools.map(String)]));
    }

    const { error } = await supabaseAdmin.from("agents").update(patch).eq("id", t.agent_id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(502).json({ error: e?.message || String(e) });
  }
}
