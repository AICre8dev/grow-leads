-- X/Twitter investor sourcing:
--   (1) allow 'twitter' as a research-lead source
--   (2) track async Apify sourcing runs so the drain step knows what to process

alter table grow_research_leads
  drop constraint if exists grow_research_leads_source_check;
alter table grow_research_leads
  add constraint grow_research_leads_source_check check (
    source in (
      'linkedin', 'crunchbase', 'product_hunt', 'launch_directory',
      'google_maps', 'github', 'website', 'csv', 'twitter'
    )
  );

create table if not exists grow_research_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'investor_x',
  brief text not null default '',
  apify_run_id text,
  apify_dataset_id text,
  status text not null default 'sourcing',
  found integer not null default 0,
  qualified integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grow_research_runs_status_check
    check (status in ('sourcing', 'draining', 'done', 'failed'))
);

create index if not exists grow_research_runs_user_idx
  on grow_research_runs(user_id, created_at desc);

create index if not exists grow_research_runs_status_idx
  on grow_research_runs(status, created_at desc);

drop trigger if exists set_grow_research_runs_updated_at on grow_research_runs;
create trigger set_grow_research_runs_updated_at
  before update on grow_research_runs
  for each row execute function set_updated_at();

alter table grow_research_runs enable row level security;

drop policy if exists "users manage own research runs" on grow_research_runs;
create policy "users manage own research runs" on grow_research_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
