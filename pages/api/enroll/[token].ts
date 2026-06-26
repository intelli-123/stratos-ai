import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stepsFor, agentKind } from "@/lib/app";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.query.token as string;

  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Supabase connection is not initialized. Please verify that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set." });
  }

  const protocol = (req.headers["x-forwarded-proto"] as string)?.split(",")[0] || "http";
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host;
  const BASE = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:4000");

  const { data: t } = await supabaseAdmin.from("enroll_tokens").select("agent_id").eq("token", token).maybeSingle();
  if (!t) return res.status(404).json({ error: "Unknown enrollment token" });
  const { data: agent } = await supabaseAdmin.from("agents").select("*").eq("id", t.agent_id).maybeSingle();
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  const steps = stepsFor(agentKind(agent), agent.name, BASE, token);
  return res.json({ agent: { id: agent.id, name: agent.name, type: agent.type }, token, steps });
}
