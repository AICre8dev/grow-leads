-- Grow Research Inbox: one pipeline for investors, startup leads, launch listings,
-- local businesses, and partner targets.

create table if not exists grow_research_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  company text not null default '',
  role text not null default '',
  intent text not null default 'startup_customer',
  source text not null default 'website',
  source_label text not null default '',
  location text not null default '',
  fit_score int not null default 70,
  status text not null default 'found',
  priority text not null default 'medium',
  signal text not null default '',
  next_action text not null default '',
  hook text not null default '',
  contact text not null default '',
  value text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grow_research_leads_intent_check check (
    intent in ('investor', 'startup_customer', 'local_business', 'launch_listing', 'agency_partner')
  ),
  constraint grow_research_leads_source_check check (
    source in ('linkedin', 'crunchbase', 'product_hunt', 'launch_directory', 'google_maps', 'github', 'website', 'csv')
  ),
  constraint grow_research_leads_status_check check (
    status in ('found', 'qualified', 'hook_ready', 'contacted', 'clicked', 'replied', 'booked', 'blocked')
  ),
  constraint grow_research_leads_priority_check check (priority in ('high', 'medium', 'low')),
  constraint grow_research_leads_fit_score_check check (fit_score between 0 and 100)
);

create index if not exists grow_research_leads_user_idx
  on grow_research_leads(user_id, updated_at desc);

create index if not exists grow_research_leads_intent_idx
  on grow_research_leads(user_id, intent, fit_score desc);

create index if not exists grow_research_leads_status_idx
  on grow_research_leads(user_id, status, updated_at desc);

drop trigger if exists set_grow_research_leads_updated_at on grow_research_leads;
create trigger set_grow_research_leads_updated_at
  before update on grow_research_leads
  for each row execute function set_updated_at();

alter table grow_research_leads enable row level security;

drop policy if exists "users manage own research leads" on grow_research_leads;
create policy "users manage own research leads" on grow_research_leads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Service role bypasses RLS automatically; used by backend API routes.
