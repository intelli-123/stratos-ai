import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { APP_NAME } from "@/lib/app";

const BASE = process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:4000";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin.from("agents").select("*").order("created_at", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ agents: data || [] });
  }

  if (req.method === "POST") {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ error: "name is required" });
    const insert = {
      name: b.name, description: b.description || null, type: b.type || "local",
      env: b.env || null, team: b.team || null, model: b.model || null, framework: b.framework || null,
      cost_budget: b.cost_budget ?? null, status: "offline",
    };
    const { data: agent, error } = await supabaseAdmin.from("agents").insert(insert).select().single();
    if (error) return res.status(500).json({ error: error.message });

    // Enrollment token (the "connect link") — installing it streams telemetry in.
    const token = crypto.randomBytes(18).toString("base64url");
    const { error: tErr } = await supabaseAdmin.from("enroll_tokens").insert({ token, agent_id: agent.id });
    if (tErr) return res.status(500).json({ error: tErr.message });

    const enroll_url = `${BASE}/onboard/${token}`;
    const snippet =
`# 1. install OpenLLMetry in your agent
npm i @traceloop/node-server-sdk

# 2. initialize it (top of your app) — streams traces/metrics to ${APP_NAME}
import * as traceloop from "@traceloop/node-server-sdk";
traceloop.initialize({
  appName: "${agent.name}",
  baseUrl: "${BASE}/api/ingest",
  headers: { "x-aether-token": "${token}" },
  disableBatch: true,
});`;

    return res.status(201).json({ agent, enroll: { token, enroll_url, snippet } });
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).end();
}
