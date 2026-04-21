-- Grow Leads schema
-- Namespaced with `lead_` prefix so it can live alongside existing Grow tables.

create table if not exists lead_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  niche text not null,
  city text not null,
  lead_count int not null default 10,
  email_template text,
  status text not null default 'pending',
  stats jsonb not null default '{"scraped":0,"sitesBuilt":0,"addedToCrm":0,"emailsSent":0}'::jsonb,
  started_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_campaigns_status_check check (status in ('pending','running','complete','failed'))
);

create table if not exists lead_engine_leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references lead_campaigns(id) on delete cascade,
  business_name text not null,
  phone text,
  email text,
  website text,
  address text,
  place_id text,
  rating numeric,
  reviews_count int,
  reviews jsonb,
  photos jsonb,
  hours jsonb,
  status text not null default 'pending',
  site_url text,
  aicre8_project_id text,
  email_sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_engine_leads_status_check check (status in ('pending','scraping','building','added_to_crm','email_sent','failed'))
);

create index if not exists lead_engine_leads_campaign_idx on lead_engine_leads(campaign_id);
create index if not exists lead_engine_leads_status_idx on lead_engine_leads(status);
create index if not exists lead_campaigns_user_idx on lead_campaigns(user_id);
create index if not exists lead_campaigns_status_idx on lead_campaigns(status);

-- updated_at triggers
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_lead_campaigns_updated_at on lead_campaigns;
create trigger set_lead_campaigns_updated_at
  before update on lead_campaigns
  for each row execute function set_updated_at();

drop trigger if exists set_lead_engine_leads_updated_at on lead_engine_leads;
create trigger set_lead_engine_leads_updated_at
  before update on lead_engine_leads
  for each row execute function set_updated_at();

-- RLS: users see only their own campaigns + leads
alter table lead_campaigns enable row level security;
alter table lead_engine_leads enable row level security;

drop policy if exists "users see own campaigns" on lead_campaigns;
create policy "users see own campaigns" on lead_campaigns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users see own leads" on lead_engine_leads;
create policy "users see own leads" on lead_engine_leads
  for all using (
    exists (
      select 1 from lead_campaigns c
      where c.id = lead_engine_leads.campaign_id and c.user_id = auth.uid()
    )
  );

-- Service role bypasses RLS automatically; used by backend cron + API routes.
