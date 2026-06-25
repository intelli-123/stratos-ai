import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase connection is not initialized. Please verify that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set." });
    }

    // Fetch agent_queries joining agents table
    const { data: rows, error } = await supabaseAdmin
      .from("agent_queries")
      .select("*, agents(name, type, team, model, framework)")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("[api/traces GET]", error);
      return res.status(500).json({ error: error.message });
    }

    // Format the rows nicely
    const traces = (rows || []).map((r: any) => ({
      id: r.id,
      agent_id: r.agent_id,
      agent_name: r.agents?.name || "unknown",
      agent_type: r.agents?.type || "agent",
      agent_team: r.agents?.team || "—",
      agent_model: r.agents?.model || "—",
      agent_framework: r.agents?.framework || "—",
      task: r.task,
      prompt: r.prompt,
      response: r.response,
      model: r.model || r.agents?.model || "—",
      tokens: r.tokens || 0,
      cost: r.cost || 0,
      latency_ms: r.latency_ms || 0,
      created_at: r.created_at,
      trace_id: r.trace_id,
    }));

    return res.json({ traces });
  } catch (e: any) {
    return res.status(502).json({ error: e?.message || String(e) });
  }
}
