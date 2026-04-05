-- Run this once in your Supabase SQL editor:
-- https://supabase.com/dashboard/project/fttlpvklerouuidnkxmh/sql

-- ─── Table ────────────────────────────────────────────────────────────────────
create table if not exists statedge_hub_tournaments (
  id          text        primary key,
  name        text        not null default 'New Tournament',
  sport       text        not null default 'netball',
  data        jsonb       not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Real-time ────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table statedge_hub_tournaments;

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- The app handles admin auth itself (PIN-based), so anon key gets full access.
alter table statedge_hub_tournaments enable row level security;

create policy "hub_anon_select"
  on statedge_hub_tournaments for select to anon using (true);

create policy "hub_anon_insert"
  on statedge_hub_tournaments for insert to anon with check (true);

create policy "hub_anon_update"
  on statedge_hub_tournaments for update to anon using (true) with check (true);

create policy "hub_anon_delete"
  on statedge_hub_tournaments for delete to anon using (true);
