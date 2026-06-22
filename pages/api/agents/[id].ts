import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const RANGES: Record<string, number> = { today: 1, "7d": 7, "30d": 30 };

function sinceFor(range: string): string {
  const now = Date.now();
  if (range === "today") { const d = new Date(now); d.setUTCHours(0, 0, 0, 0); return d.toISOString(); }
  const days = RANGES[range] ?? 30;
  return new Date(now - days * 86400_000).toISOString();
}

const csvCell = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = req.query.id as string;

  if (req.method === "GET") {
    const range = String(req.query.range || "30d");
    const sort = String(req.query.sort || "recent"); // recent | cost_desc | cost_asc
    const since = sinceFor(range);

    const { data: agent, error: aErr } = await supabaseAdmin.from("agents").select("*").eq("id", id).maybeSingle();
    if (aErr) return res.status(500).json({ error: aErr.message });
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    let q = supabaseAdmin.from("agent_queries").select("*").eq("agent_id", id).gte("created_at", since);
    q = sort === "cost_desc" ? q.order("cost", { ascending: false })
      : sort === "cost_asc" ? q.order("cost", { ascending: true })
      : q.order("created_at", { ascending: false });
    const { data: queries, error: qErr } = await q.limit(1000);
    if (qErr) return res.status(500).json({ error: qErr.message });

    const rows = queries || [];
    const summary = {
      count: rows.length,
      tokens: rows.reduce((s, r) => s + (r.tokens || 0), 0),
      cost: +rows.reduce((s, r) => s + (r.cost || 0), 0).toFixed(6),
      avg_latency: rows.length ? Math.round(rows.reduce((s, r) => s + (r.latency_ms || 0), 0) / rows.length) : 0,
    };

    if (String(req.query.format) === "csv") {
      const header = ["time", "task", "model", "prompt", "response", "tokens", "cost_usd", "latency_ms"];
      const lines = [header.join(",")];
      for (const r of rows) lines.push([
        r.created_at, r.task, r.model, r.prompt, r.response, r.tokens, r.cost, r.latency_ms,
      ].map(csvCell).join(","));
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${agent.name}-${range}.csv"`);
      return res.send(lines.join("\r\n"));
    }

    return res.json({ agent, queries: rows, summary, range, sort });
  }

  if (req.method === "PATCH") {
    const b = req.body || {};
    const patch: Record<string, any> = {};
    for (const k of ["name", "description", "type", "env", "team", "model", "framework", "cost_budget", "status"]) {
      if (k in b) patch[k] = b[k];
    }
    const { data, error } = await supabaseAdmin.from("agents").update(patch).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ agent: data });
  }

  if (req.method === "DELETE") {
    const { error } = await supabaseAdmin.from("agents").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  res.setHeader("Allow", "GET, PATCH, DELETE");
  res.status(405).end();
}
