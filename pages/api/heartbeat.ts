import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Lightweight liveness ping from the SDK. Keeps an agent "online" while its
// process is up, even when it isn't actively serving LLM queries. Resolves the
// agent by enrollment token and bumps last_seen (+ flips status online).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).end(); }
  try {
    const token = (req.headers["x-stratos-token"] as string) || (req.headers["x-aether-token"] as string) || "";
    if (!token) return res.status(400).json({ error: "missing x-aether-token" });
    const { data: t } = await supabaseAdmin.from("enroll_tokens").select("agent_id").eq("token", token).maybeSingle();
    if (!t?.agent_id) return res.status(404).json({ error: "unknown token" });
    const { error } = await supabaseAdmin
      .from("agents")
      .update({ status: "online", last_seen: new Date().toISOString() })
      .eq("id", t.agent_id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(502).json({ error: e?.message || String(e) });
  }
}
