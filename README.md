# Stratos AI — Agent Observability

A Next.js + Supabase observability platform for AI agents (local / MCP / remote).
Track **liveness**, **tokens & cost** (per agent and per query), **prompts**,
**tools**, and per-agent **budgets** — with one-line agent onboarding via
[OpenLLMetry](https://traceloop.com/docs/openllmetry) / OpenTelemetry.

> Branding is centralized in `lib/app.ts` (`APP_NAME`) — rename once to rebrand everywhere.

## Stack
- **Next.js 14** (pages router) + React 18 + TypeScript
- **Supabase** (Postgres) for agents, per-query telemetry and enrollment tokens
- **OpenLLMetry / OTLP-JSON** ingest, surfaced through [`@intelli-1113/stratos-sdk`](https://www.npmjs.com/package/@intelli-1113/stratos-sdk)

## Setup
```bash
npm install
```
1. In the **Supabase SQL editor**, run `supabase/schema.sql` (creates `agents`,
   `agent_queries`, `enroll_tokens` + demo RLS), then `supabase/migration-2026-06-prompts.sql`
   (adds `prompt`/`response`/`model` to `agent_queries`).
2. Create `.env.local` from `.env.example` with your Supabase URL + publishable key.
   For production add a server-only `SUPABASE_SERVICE_ROLE_KEY` (writes/ingest bypass RLS).
3. `npm run dev` → http://localhost:4000

> Behind a TLS-inspection proxy? Drop the corporate root CA at `certs/corporate-ca.pem`
> — `scripts/run-next.js` auto-trusts it via `NODE_EXTRA_CA_CERTS` (no disabling of TLS).

## Onboarding an agent
1. **Add agent** in the UI → Stratos mints an enrollment token + connect link.
   The agent stays out of the fleet until it reports in.
2. In the agent, install the SDK and set env:
   ```bash
   npm i @intelli-1113/stratos-sdk
   # .env
   STRATOS_TOKEN=<token>           # from Add agent
   STRATOS_URL=http://localhost:4000
   STRATOS_APP_NAME=my-agent
   ```
3. Run with telemetry — zero code changes:
   ```bash
   node --import @intelli-1113/stratos-sdk/register server.js
   ```
   …or add `import "@intelli-1113/stratos-sdk/register";` as the first line of your entrypoint.

On its first trace the agent flips to **Connected/online** with live metrics, and
auto-shows **offline** when it stops reporting. The URL/token live in env, so they
change without code edits.

### Monitoring MCP servers (Claude Desktop / Cursor / VS Code)
The **same** `@intelli-1113/stratos-sdk` package ships a `stratos-mcp-proxy` command — one install
covers both agents and MCP. Add an agent (type `mcp`), then wrap the command in the host
config (e.g. `claude_desktop_config.json`):
```json
"weather": {
  "command": "npx",
  "args": ["-y","@intelli-1113/stratos-sdk","stratos-mcp-proxy","--","npx","-y","@scope/weather-mcp@latest"],
  "env": { "STRATOS_TOKEN":"<token>", "STRATOS_URL":"http://localhost:4000", "STRATOS_APP_NAME":"weather" }
}
```
Restart the host. You'll see the server **online** with its **tool calls** (name, args, result,
latency). Note: host MCP servers don't call the LLM themselves, so tokens/cost aren't captured —
the model runs inside the host.

## How it works
- **Mission Control** — live KPIs (agents online, tokens, spend, queries).
- **Agents** — grid filtered by type (local/mcp/remote) **and** status (online/offline),
  plus search. Click an agent for a **detail popup**: Today / 7d / 30d window, prompt +
  cost table, cost sort (high/low), and **CSV export**.
- **Onboarding** — pending vs connected agents, copy-able SDK steps, and delete.
- **Ingest** (`POST /api/ingest`) — accepts OTLP-JSON, header `x-stratos-token`
  (legacy `x-aether-token` still honored). Maps `gen_ai.*`/`llm.*` spans → per-query
  rows (tokens, cost, prompt, response, latency) and rolls up agent totals + liveness.
- **Heartbeat** (`POST /api/heartbeat`) — keeps an agent online while its process runs.
- **Cost budget** per agent is editable and stored in Supabase.
- **Theme** — day/night toggle (persisted), applied across all pages and popups.

## Project layout
```
pages/            UI + API routes (agents, ingest, heartbeat, enroll, health)
components/        Layout, AgentCard, modals, Snippet, ThemeToggle
lib/app.ts         branding, types, liveStatus, SDK snippet builder
supabase/          schema.sql + migrations
scripts/run-next.js  dev/build launcher (corporate-CA aware)
```

## Status
- ✅ Mission Control, Agents (+ detail popup, filters), Onboarding (SDK + delete),
  OTLP ingest + heartbeat, prompt/cost capture, day/night theme, schema + migration.
- ⏳ Stubbed for next: Traces, Token Economy, MCP Proxy, Incidents (agent-down **email**), Ask, Users & Access.

Built by **L&T Technology Services** · on OpenLLMetry / OpenTelemetry.
