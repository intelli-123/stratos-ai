# Stratos AI — Agent Observability

A Next.js + Supabase observability platform for AI agents (local / MCP / remote): liveness,
tokens & cost per agent and per query, tools per agent, filters, and zero-code
onboarding via OpenLLMetry/OpenTelemetry. *(Name centralized in `lib/app.ts` —
rename `APP_NAME` to rebrand everywhere.)*

## Setup
```bash
npm install
```
1. In the **Supabase SQL editor**, run `supabase/schema.sql` (creates `agents`,
   `agent_queries`, `enroll_tokens` + demo RLS).
2. `.env.local` already has your project URL + publishable key. For production,
   add a server-only `SUPABASE_SERVICE_ROLE_KEY` (writes/ingest bypass RLS).
3. `npm run dev` → http://localhost:4000

## How it works
- **Agents page** reads live from Supabase (`/api/agents`) — filter ALL/LOCAL/MCP/REMOTE, search.
- **Add Agent** creates the agent + an **enrollment token** and shows an onboarding
  link (`/onboard/<token>`) + an OpenLLMetry install snippet to share. No static data.
- **Ingest:** the agent runs OpenLLMetry pointed at `POST /api/ingest`
  (`OTEL_EXPORTER_OTLP_PROTOCOL=http/json`, header `x-aether-token`). `/api/ingest`
  maps `gen_ai.*`/`llm.*` spans → per-query rows + rolls up agent tokens/cost/queries/tools
  and flips the agent **online** (liveness from `last_seen`).
- **Mission Control** shows live KPIs (online, tokens, spend, queries).
- **Cost budget** per agent is editable (Edit → Cost budget) and stored in Supabase.

## Status
- ✅ Stack, theme, full nav scaffold, Agents page, Add-Agent + enrollment, OTLP ingest, schema.
- ⏳ Stubbed for next: Traces, Token Economy, MCP Proxy, Incidents (agent-down **email** — provider TBD), Ask, Users & Access.
- The OpenLLMetry/SDK refactor of the old tower is intentionally **parked**.

Built by L&T Technology Services · on OpenLLMetry / OpenTelemetry.
