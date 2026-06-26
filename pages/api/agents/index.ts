import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildEnrollSnippet, stepsFor, agentKind } from "@/lib/app";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
 try {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Supabase connection is not initialized. Please verify that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set." });
  }

  const protocol = (req.headers["x-forwarded-proto"] as string)?.split(",")[0] || "http";
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host;
  const BASE = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:4000");

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin.from("agents").select("*").order("created_at", { ascending: true });
    if (error) { console.error("[api/agents GET]", error); return res.status(500).json({ error: error.message, code: error.code, hint: error.hint }); }
    // An agent only joins the fleet once it has actually reported telemetry
    // (last_seen set). Until then it's a pending enrollment, surfaced only on
    // the Onboarding page as "awaiting connection".
    const all = data || [];
    const agents = all.filter((a) => a.last_seen);
    const pending = all.filter((a) => !a.last_seen);
    return res.json({ agents, pending });
  }

  if (req.method === "POST") {
    const b = req.body || {};
    if (
      !b.name ||
      !b.description ||
      !b.type ||
      !b.env ||
      !b.team ||
      b.cost_budget === null ||
      b.cost_budget === undefined ||
      b.cost_budget === "" ||
      !b.model ||
      !b.framework
    ) {
      return res.status(400).json({ error: "All fields are mandatory" });
    }
    const insert = {
      name: b.name, description: b.description, type: b.type,
      env: b.env, team: b.team, model: b.model, framework: b.framework,
      cost_budget: Number(b.cost_budget), status: "pending",
    };
    const { data: agent, error } = await supabaseAdmin.from("agents").insert(insert).select().single();
    if (error) { console.error("[api/agents POST]", error); return res.status(500).json({ error: error.message, code: error.code, hint: error.hint }); }

    // Enrollment token (the "connect link") — installing it streams telemetry in.
    const token = crypto.randomBytes(18).toString("base64url");
    const { error: tErr } = await supabaseAdmin.from("enroll_tokens").insert({ token, agent_id: agent.id });
    if (tErr) { console.error("[api/agents token]", tErr); return res.status(500).json({ error: tErr.message, code: tErr.code }); }

    const enroll_url = `${BASE}/onboard/${token}`;
    const steps = stepsFor(agentKind(agent), agent.name, BASE, token);

    return res.status(201).json({ agent, enroll: { token, enroll_url, steps, snippet: buildEnrollSnippet(agent.name, BASE, token) } });
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).end();
 } catch (e: any) {
  // Network/TLS failure reaching Supabase, etc. Surface the real cause.
  console.error("[api/agents] fetch error:", e?.message, e?.cause?.code || "");
  return res.status(502).json({ error: e?.message || String(e), cause: e?.cause?.code || null, hint: "Could not reach Supabase (network/TLS/proxy?)" });
 }
}
