// Single source of truth for branding — rename here to rebrand everywhere.
export const APP_NAME    = "Aethyr";
export const APP_TAGLINE = "Control Tower";
export const APP_VENDOR  = "L&T Technology Services";
export const APP_BLURB   = "Agent Control Tower — built on OpenLLMetry / OpenTelemetry";

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
