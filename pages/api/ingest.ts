import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Accepts OpenLLMetry / OTLP-HTTP **JSON** trace batches (set the agent's
// OTEL_EXPORTER_OTLP_PROTOCOL=http/json). Maps gen_ai.* / llm.* spans onto the
// agent identified by the x-aether-token (preferred) or service.name.
export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

const attrs = (a: any[]) => {
  const m: Record<string, any> = {};
  for (const x of a || []) {
    const v = x.value || {};
    m[x.key] = v.stringValue ?? (v.intValue !== undefined ? Number(v.intValue)
      : v.doubleValue ?? v.boolValue);
  }
  return m;
};
const pick = (m: any, keys: string[]) => { for (const k of keys) { const v = m[k]; if (v !== undefined && v !== null && v !== "") return v; } return undefined; };
const clip = (s: any, n = 4000) => { const t = s == null ? "" : String(s); return t.length > n ? t.slice(0, n) + "…" : t; };
// --- prompt/response extraction -------------------------------------------
// traceloop 0.27 emits the NEW OTel semconv: gen_ai.input.messages /
// gen_ai.output.messages as JSON arrays of {role, parts:[{type,content}]}.
// Older versions used indexed gen_ai.prompt.{i}.content, and LangChain
// chain/tool spans carry traceloop.entity.input/output JSON. Handle all three.
const partsText = (parts: any): string => {
  if (typeof parts === "string") return parts;
  if (Array.isArray(parts)) return parts.map((p) => (typeof p === "string" ? p : (p?.content ?? p?.text ?? ""))).filter(Boolean).join("\n");
  return "";
};
function fromSemconv(json: any, preferRole: string | null): string {
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return "";
    const textOf = (m: any) => partsText(m?.parts ?? m?.content);
    if (preferRole) {
      const matches = arr.filter((m) => String(m?.role || "").toLowerCase() === preferRole);
      const pool = matches.length ? matches : arr;
      return textOf(pool[pool.length - 1]);
    }
    return textOf(arr[0]);
  } catch { return ""; }
}
// Pull every string under a "content"/"text" key from arbitrary JSON (LangChain
// serializes HumanMessage etc. as {kwargs:{content}} — no flat role field).
function deepContents(json: any): string[] {
  const out: string[] = [];
  try {
    const visit = (v: any) => {
      if (v == null || typeof v === "string") return;
      if (Array.isArray(v)) return v.forEach(visit);
      if (typeof v === "object") for (const [k, val] of Object.entries(v)) {
        if ((k === "content" || k === "text") && typeof val === "string" && val.trim()) out.push(val);
        else visit(val);
      }
    };
    visit(JSON.parse(json));
  } catch {}
  return out;
}
function extractContent(a: Record<string, any>) {
  let prompt = fromSemconv(a["gen_ai.input.messages"], "user");
  let response = fromSemconv(a["gen_ai.output.messages"], null);

  // Legacy indexed attrs (older OpenLLMetry).
  if (!prompt || !response) {
    const pIdx: number[] = [], cIdx: number[] = [];
    for (const k of Object.keys(a)) {
      let m = k.match(/^gen_ai\.prompt\.(\d+)\.content$/); if (m) pIdx.push(Number(m[1]));
      m = k.match(/^gen_ai\.completion\.(\d+)\.content$/); if (m) cIdx.push(Number(m[1]));
    }
    if (!prompt && pIdx.length) {
      const users = pIdx.filter((i) => String(a[`gen_ai.prompt.${i}.role`] || "").toLowerCase() === "user");
      const pi = (users.length ? users : pIdx).sort((x, y) => y - x)[0];
      prompt = a[`gen_ai.prompt.${pi}.content`] || "";
    }
    if (!response && cIdx.length) response = a[`gen_ai.completion.${cIdx.sort((x, y) => x - y)[0]}.content`] || "";
  }

  // LangChain chain/tool spans carry I/O here as JSON.
  if (!prompt && a["traceloop.entity.input"]) {
    const cs = deepContents(a["traceloop.entity.input"]); if (cs.length) prompt = cs[cs.length - 1];
  }
  if (!response && a["traceloop.entity.output"]) {
    const cs = deepContents(a["traceloop.entity.output"]);
    if (cs.length) response = cs[0];
    else { try { const o = JSON.parse(a["traceloop.entity.output"]); if (typeof o === "string") response = o; } catch {} }
  }
  return { prompt: clip(prompt), response: clip(response) };
}
const RATES: Record<string, [number, number]> = { // per 1k: [in, out]
  "gpt-4o": [0.005, 0.015], "gpt-4o-mini": [0.00015, 0.0006],
  "claude-sonnet-4-6": [0.003, 0.015], "claude-opus-4-8": [0.015, 0.075], default: [0.001, 0.003],
};
const estCost = (model: string | undefined, i: number, o: number) => {
  const r = RATES[model || "default"] || RATES.default;
  return (i / 1000) * r[0] + (o / 1000) * r[1];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).end(); }
  try {
    const token = (req.headers["x-stratos-token"] as string) || (req.headers["x-aether-token"] as string) || "";
    const ct = String(req.headers["content-type"] || "");
    console.log(`[ingest] hit ct=${ct} token=${token ? token.slice(0, 6) + "…" : "none"} spans=${(req.body?.resourceSpans || req.body?.resource_spans || []).length}`);
    const body = req.body || {};
    // Aggregate per service.name across the batch.
    const perSvc: Record<string, { tokens: number; cost: number; queries: number; tools: Set<string>; model?: string; rows: any[] }> = {};

    for (const rs of body.resourceSpans || body.resource_spans || []) {
      const res0 = attrs(rs.resource?.attributes);
      const svc = pick(res0, ["service.name"]) || "otel-agent";
      const bucket = perSvc[svc] || (perSvc[svc] = { tokens: 0, cost: 0, queries: 0, tools: new Set(), rows: [] });
      for (const ss of rs.scopeSpans || rs.scope_spans || []) {
        for (const sp of ss.spans || []) {
          const a = attrs(sp.attributes);
          const model = pick(a, ["gen_ai.request.model", "gen_ai.response.model", "llm.model_name", "llm.request.model"]);
          const inTok = Number(pick(a, ["gen_ai.usage.input_tokens", "gen_ai.usage.prompt_tokens", "llm.usage.prompt_tokens", "llm.token_count.prompt"]) || 0);
          const outTok = Number(pick(a, ["gen_ai.usage.output_tokens", "gen_ai.usage.completion_tokens", "llm.usage.completion_tokens", "llm.token_count.completion"]) || 0);
          const op = String(pick(a, ["gen_ai.operation.name", "openinference.span.kind", "traceloop.span.kind"]) || "").toLowerCase();
          // MCP tool spans (e.g. from stratos-mcp-proxy) name the tool via traceloop.entity.name.
          const toolName = pick(a, ["gen_ai.tool.name", "tool.name", ...(op === "tool" ? ["traceloop.entity.name"] : [])]);
          const isTool = !!toolName || op === "execute_tool" || op === "tool";
          const isLlm = !isTool && (model || inTok || outTok || /llm|chat|completion/i.test(op) || /llm|chat|completion/i.test(sp.name || ""));
          if (!isLlm && !isTool) continue;
          let latency = 0;
          try { if (sp.startTimeUnixNano && sp.endTimeUnixNano) latency = Math.round(Number(BigInt(sp.endTimeUnixNano) - BigInt(sp.startTimeUnixNano)) / 1e6); } catch {}
          const tokens = inTok + outTok;
          const cost = isLlm ? (Number(pick(a, ["gen_ai.usage.cost", "llm.usage.total_cost"])) || estCost(model, inTok, outTok)) : 0;
          if (toolName) bucket.tools.add(String(toolName));
          if (model) bucket.model = model;
          const { prompt, response } = extractContent(a); // capture I/O for LLM and tool steps
          bucket.tokens += tokens; bucket.cost += cost; bucket.queries += 1;
          bucket.rows.push({
            task: isTool ? (toolName ? `tool:${toolName}` : (sp.name || "tool")) : (sp.name || op || "llm"),
            prompt: prompt || null, response: response || null, model: model || null,
            trace_id: sp.traceId || sp.trace_id || null,
            tokens, cost: +cost.toFixed(6), latency_ms: latency,
          });
        }
      }
    }

    // Resolve which agent these belong to: token first, else service.name.
    let tokenAgentId: string | null = null;
    if (token) {
      const { data } = await supabaseAdmin.from("enroll_tokens").select("agent_id").eq("token", token).maybeSingle();
      tokenAgentId = data?.agent_id || null;
    }

    for (const [svc, b] of Object.entries(perSvc)) {
      let agent: any = null;
      if (tokenAgentId) {
        const { data } = await supabaseAdmin.from("agents").select("*").eq("id", tokenAgentId).maybeSingle();
        agent = data;
      }
      if (!agent) {
        const { data } = await supabaseAdmin.from("agents").select("*").eq("name", svc).maybeSingle();
        agent = data;
      }
      if (!agent) { // dynamic onboarding: first time we see this service.name
        const { data } = await supabaseAdmin.from("agents").insert({ name: svc, type: "local", status: "online", model: b.model || null }).select().single();
        agent = data;
      }
      if (!agent) continue;

      const mergedTools = Array.from(new Set([...(agent.tools || []), ...b.tools]));
      await supabaseAdmin.from("agents").update({
        tokens: (agent.tokens || 0) + b.tokens,
        cost: +((agent.cost || 0) + b.cost).toFixed(6),
        queries: (agent.queries || 0) + b.queries,
        tools: mergedTools, model: b.model || agent.model, status: "online", last_seen: new Date().toISOString(),
      }).eq("id", agent.id);

      if (b.rows.length) {
        const rows = b.rows.map((r) => ({ ...r, agent_id: agent.id }));
        const { error } = await supabaseAdmin.from("agent_queries").insert(rows);
        if (error) {
          // Most likely the prompt/response/model columns aren't migrated yet.
          // Fall back to the base columns so per-query rows still record.
          const base = rows.map(({ prompt, response, model, trace_id, ...rest }) => rest);
          const retry = await supabaseAdmin.from("agent_queries").insert(base);
          if (retry.error) console.warn("[ingest] agent_queries insert failed:", retry.error.message);
          else console.warn("[ingest] inserted without prompt/response/model — run supabase/migration-2026-06-prompts.sql for full capture");
        }
      }
    }
    return res.status(200).json({ partialSuccess: {} });
  } catch (e: any) {
    console.warn("[ingest] error:", e.message);
    return res.status(200).json({ partialSuccess: {} }); // never fail the exporter
  }
}
