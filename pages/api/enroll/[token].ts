import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildEnrollSteps } from "@/lib/app";

const BASE = process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:4000";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.query.token as string;
  const { data: t } = await supabaseAdmin.from("enroll_tokens").select("agent_id").eq("token", token).maybeSingle();
  if (!t) return res.status(404).json({ error: "Unknown enrollment token" });
  const { data: agent } = await supabaseAdmin.from("agents").select("*").eq("id", t.agent_id).maybeSingle();
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  const steps = buildEnrollSteps(agent.name, BASE, token);
  return res.json({ agent: { id: agent.id, name: agent.name, type: agent.type }, token, steps });
}
