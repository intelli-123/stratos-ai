-- Aethyr migration: capture prompt/response/model per query for the agent
-- detail view. Run once in the Supabase SQL editor (safe to re-run).
alter table agent_queries add column if not exists prompt   text;
alter table agent_queries add column if not exists response text;
alter table agent_queries add column if not exists model    text;
