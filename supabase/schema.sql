-- Aethyr — Supabase schema. Run this in the Supabase SQL editor once.

create extension if not exists "pgcrypto";

create table if not exists agents (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  type        text not null default 'local',   -- local | mcp | remote
  status      text not null default 'offline',  -- online | offline | degraded
  env         text,
  team        text,
  model       text,
  framework   text,
  tokens      bigint default 0,
  cost        double precision default 0,
  queries     bigint default 0,
  cost_budget double precision,                 -- admin-set budget (USD)
  tools       jsonb default '[]'::jsonb,
  last_seen   timestamptz,
  created_at  timestamptz default now()
);

create table if not exists agent_queries (
  id         uuid primary key default gen_random_uuid(),
  agent_id   uuid references agents(id) on delete cascade,
  task       text,
  prompt     text,                -- user prompt (gen_ai.input.messages / legacy / entity.input)
  response   text,                -- model completion (gen_ai.output.messages / legacy)
  model      text,
  trace_id   text,                -- groups the spans of one request into an execution
  tokens     bigint,
  cost       double precision,
  latency_ms integer,
  created_at timestamptz default now()
);
create index if not exists idx_aq_trace on agent_queries(agent_id, trace_id);
-- If the table already exists from an earlier install, add the new columns:
alter table agent_queries add column if not exists prompt   text;
alter table agent_queries add column if not exists response text;
alter table agent_queries add column if not exists trace_id text;
alter table agent_queries add column if not exists model    text;
create index if not exists idx_aq_agent on agent_queries(agent_id, created_at desc);

create table if not exists enroll_tokens (
  token      text primary key,
  agent_id   uuid references agents(id) on delete cascade,
  created_at timestamptz default now()
);

-- DEMO row-level security: allow the publishable (anon) key full access so the
-- app works out-of-the-box. LOCK THIS DOWN for production (or use a service-role
-- key server-side and restrict anon to SELECT).
alter table agents        enable row level security;
alter table agent_queries enable row level security;
alter table enroll_tokens enable row level security;

drop policy if exists "demo_all" on agents;
drop policy if exists "demo_all" on agent_queries;
drop policy if exists "demo_all" on enroll_tokens;
create policy "demo_all" on agents        for all using (true) with check (true);
create policy "demo_all" on agent_queries for all using (true) with check (true);
create policy "demo_all" on enroll_tokens for all using (true) with check (true);
