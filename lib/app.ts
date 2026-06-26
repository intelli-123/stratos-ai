// Single source of truth for branding — rename here to rebrand everywhere.
export const APP_NAME    = "Stratos AI";
export const APP_TAGLINE = "Agent Observability";
export const APP_VENDOR  = "L&T Technology Services";
export const APP_BLURB   = "AI agent observability — built on OpenLLMetry / OpenTelemetry";

export type AgentType   = "agent" | "mcp";
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
  prompt?: string | null;
  response?: string | null;
  model?: string | null;
  trace_id?: string | null;
  tokens?: number | null;
  cost?: number | null;
  latency_ms?: number | null;
  started_at?: string | null;
  created_at?: string | null;
}

// One user request = a group of spans (chain + LLM calls + tool calls).
export interface Execution {
  id: string;
  started_at: string;
  prompt?: string | null;
  model?: string | null;
  tokens: number;
  cost: number;
  latency_ms: number;
  steps: AgentQuery[];
}

export interface DailyPoint { date: string; cost: number; }
export interface AgentSpend { name: string; cost: number; }

export const FILTERS: ("all" | AgentType)[] = ["all", "agent", "mcp"];
export const FILTER_LABELS: Record<string, string> = { all: "All", agent: "Agents", mcp: "MCP" };
// Map legacy local/remote types onto "agent" so old data still filters/labels right.
export const agentKind = (a: { type?: string | null }): AgentType => (a?.type === "mcp" ? "mcp" : "agent");

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

// Onboarding via the @lnt/stratos-sdk package: install, set env, run with
// `--import`. No per-agent file, and the URL/token live in env so they can
// change without code edits. Each step is rendered with its own copy button.
export const SDK_PACKAGE = "@intelli-1113/stratos-sdk";

export interface EnrollStep { title: string; lang: "bash" | "env" | "js" | "json"; code: string; }

export function buildEnrollSteps(agentName: string, baseUrl: string, token: string): EnrollStep[] {
  return [
    { title: "1. Install the Stratos SDK", lang: "bash", code: `npm i ${SDK_PACKAGE}` },
    { title: "2. Add these to your agent's .env", lang: "env", code: `STRATOS_TOKEN=${token}\nSTRATOS_URL=${baseUrl}\nSTRATOS_APP_NAME=${agentName}` },
    { title: "3. Run with telemetry — zero code changes", lang: "bash", code: `node --import ${SDK_PACKAGE}/register server.js` },
    { title: "…or add one line at the very top of your entrypoint instead", lang: "js", code: `import "${SDK_PACKAGE}/register";` },
  ];
}

// MCP servers (Claude Desktop / Cursor / VS Code / Claude Code): wrap the real
// server with the bundled stratos-mcp-proxy so its tool calls + liveness report in.
export function buildMcpSteps(agentName: string, baseUrl: string, token: string): EnrollStep[] {
  const config = `"${agentName}": {
  "command": "npx",
  "args": ["-y","-p","${SDK_PACKAGE}","stratos-mcp-proxy","--","npx","-y","<your-mcp-server>"],
  "env": {
    "STRATOS_TOKEN": "${token}",
    "STRATOS_URL": "${baseUrl}",
    "STRATOS_APP_NAME": "${agentName}"
  }
}`;
  return [
    { title: "1. Add this MCP server to your host config (Claude Desktop / Cursor / VS Code / Claude Code)", lang: "json", code: config },
    { title: "2. Replace <your-mcp-server> with the real server package/command, then restart the host", lang: "bash", code: `# e.g. ...,"--","npx","-y","@modelcontextprotocol/server-filesystem","/path"` },
  ];
}

// Pick the right recipe for an agent's type.
export function stepsFor(type: AgentType, agentName: string, baseUrl: string, token: string): EnrollStep[] {
  return type === "mcp" ? buildMcpSteps(agentName, baseUrl, token) : buildEnrollSteps(agentName, baseUrl, token);
}

// Plain-string form (CSV/back-compat) — joins the steps.
export function buildEnrollSnippet(agentName: string, baseUrl: string, token: string) {
  return buildEnrollSteps(agentName, baseUrl, token).map((s) => `# ${s.title}\n${s.code}`).join("\n\n");
}
