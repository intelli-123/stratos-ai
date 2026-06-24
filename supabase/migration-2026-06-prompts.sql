-- Stratos AI migration: per-query prompt/response/model capture + execution
-- grouping. Run once in the Supabase SQL editor (safe to re-run).
alter table agent_queries add column if not exists prompt   text;
alter table agent_queries add column if not exists response text;
alter table agent_queries add column if not exists model    text;
alter table agent_queries add column if not exists trace_id text;   -- groups spans of one request
create index if not exists idx_aq_trace on agent_queries(agent_id, trace_id);
