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

    // Fetch chronologically so steps within an execution are in order.
    const { data: queries, error: qErr } = await supabaseAdmin
      .from("agent_queries").select("*").eq("agent_id", id)
      .gte("created_at", since).order("created_at", { ascending: true }).limit(2000);
    if (qErr) return res.status(500).json({ error: qErr.message });
    const rows = queries || [];

    // Group the spans of one request into an execution. Prefer a shared trace_id;
    // otherwise cluster adjacent spans within a short time gap (many agents don't
    // propagate trace context across a chain, so each span gets its own trace_id).
    const GAP_MS = 15000;
    const clusters: any[][] = [];
    let cur: any[] | null = null;
    let lastT = 0, prevTrace: string | null = null;
    for (const r of rows) {
      const t = +new Date(r.created_at);
      const sameTrace = !!(r.trace_id && prevTrace && r.trace_id === prevTrace);
      if (cur && (sameTrace || t - lastT <= GAP_MS)) cur.push(r);
      else { cur = [r]; clusters.push(cur); }
      lastT = t; prevTrace = r.trace_id || null;
    }
    let executions = clusters.map((steps) => {
      const withPrompt = steps.find((s) => s.prompt);
      const responses = steps.filter((s) => s.response);
      return {
        id: steps[0].trace_id || steps[0].id,
        started_at: steps[0].created_at,
        prompt: (withPrompt?.prompt) || null,
        model: steps.find((s) => s.model)?.model || agent.model || null,
        tokens: steps.reduce((s, r) => s + (r.tokens || 0), 0),
        cost: +steps.reduce((s, r) => s + (r.cost || 0), 0).toFixed(6),
        latency_ms: steps.reduce((m, r) => Math.max(m, r.latency_ms || 0), 0),
        steps,
      };
    });

    executions = sort === "cost_desc" ? executions.sort((a, b) => b.cost - a.cost)
      : sort === "cost_asc" ? executions.sort((a, b) => a.cost - b.cost)
      : executions.sort((a, b) => +new Date(b.started_at) - +new Date(a.started_at));

    const summary = {
      count: executions.length,
      tokens: executions.reduce((s, e) => s + e.tokens, 0),
      cost: +executions.reduce((s, e) => s + e.cost, 0).toFixed(6),
      avg_latency: executions.length ? Math.round(executions.reduce((s, e) => s + e.latency_ms, 0) / executions.length) : 0,
    };

    if (String(req.query.format) === "csv") {
      const header = ["time", "prompt", "model", "tokens", "cost_usd", "latency_ms", "steps"];
      const lines = [header.join(",")];
      for (const e of executions) lines.push([
        e.started_at, e.prompt, e.model, e.tokens, e.cost, e.latency_ms, e.steps.length,
      ].map(csvCell).join(","));
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${agent.name}-${range}.csv"`);
      return res.send(lines.join("\r\n"));
    }

    return res.json({ agent, executions, summary, range, sort });
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
