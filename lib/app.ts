// Single source of truth for branding — rename here to rebrand everywhere.
export const APP_NAME    = "Stratos AI";
export const APP_TAGLINE = "Agent Observability";
export const APP_VENDOR  = "L&T Technology Services";
export const APP_BLURB   = "AI agent observability — built on OpenLLMetry / OpenTelemetry";

export type AgentType   = "local" | "mcp" | "remote";
export type AgentStatus = "online" | "offline" | "degraded";

export interface Agent {
  id: string;
  name: string;
  description?: string | null;
  type: AgentType;
  status: AgentStatus;
  env?: string | null;
  team?: string | null;
  model?: string | null;
  framework?: string | null;
  tokens?: number | null;       // cumulative tokens
  cost?: number | null;         // cumulative cost (USD)
  queries?: number | null;      // cumulative runs/queries
  cost_budget?: number | null;  // admin-set budget per agent (USD)
  tools?: string[] | null;
  last_seen?: string | null;
  created_at?: string | null;
}

export interface AgentQuery {
  id: string;
  agent_id: string;
  task?: string | null;
  tokens?: number | null;
  cost?: number | null;
  latency_ms?: number | null;
  started_at?: string | null;
  created_at?: string | null;
}

export const FILTERS: ("all" | AgentType)[] = ["all", "local", "mcp", "remote"];

export const fmtCost = (n?: number | null) =>
  n == null ? "$0.0000" : n < 1 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
export const fmtNum = (n?: number | null) => {
  const v = n || 0;
  return v >= 1000 ? (v / 1000).toFixed(1) + "K" : String(v);
};
// An agent is "online" if it reported within this window.
export const LIVENESS_MS = 90_000;

// Effective liveness derived from last_seen (the stored status can go stale).
export function liveStatus(a: Agent): "online" | "offline" | "degraded" {
  if (a.status === "degraded") return "degraded";
  if (a.last_seen) return Date.now() - new Date(a.last_seen).getTime() < LIVENESS_MS ? "online" : "offline";
  return (a.status as any) === "online" ? "online" : "offline";
}

// The exact, verified OpenLLMetry integration. Traceloop defaults to OTLP
// *protobuf* at `<baseUrl>/v1/traces`; Stratos AI ingests OTLP *JSON* at /api/ingest,
// so we hand traceloop a JSON HTTP exporter pointed straight at the ingest URL.
// `instrument.js` must be imported BEFORE any LLM library so it can patch it.
export function buildEnrollSnippet(agentName: string, baseUrl: string, token: string) {
  const ingest = `${baseUrl}/api/ingest`;
  const heartbeat = `${baseUrl}/api/heartbeat`;
  return `# 1. install the SDK + JSON exporter
npm i @traceloop/node-server-sdk @opentelemetry/exporter-trace-otlp-http

# 2. create instrument.js
import * as traceloop from "@traceloop/node-server-sdk";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
traceloop.initialize({
  appName: "${agentName}",
  disableBatch: true,
  exporter: new OTLPTraceExporter({
    url: "${ingest}",
    headers: { "x-aether-token": "${token}" },
  }),
});
// heartbeat keeps the agent "online" while the process runs (offline when it stops)
const ping = () => fetch("${heartbeat}", { method: "POST", headers: { "x-aether-token": "${token}" } }).catch(() => {});
ping(); setInterval(ping, 30000).unref();

# 3. import it FIRST in your entrypoint (before openai/langchain/etc.)
import "./instrument.js";`;
}
