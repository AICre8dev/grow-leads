-- Grow credits + Stripe checkout support.

create table if not exists grow_credit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  available_credits int not null default 0,
  reserved_credits int not null default 0,
  lifetime_credits_granted int not null default 0,
  lifetime_credits_spent int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grow_credit_accounts_non_negative check (
    available_credits >= 0 and reserved_credits >= 0
  )
);

create table if not exists grow_credit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references lead_campaigns(id) on delete set null,
  event_type text not null,
  amount int not null,
  balance_after int not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint grow_credit_events_type_check check (
    event_type in ('grant', 'reserve', 'spend', 'refund', 'adjustment')
  )
);

create table if not exists grow_stripe_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_session_id text not null unique,
  stripe_price_id text not null,
  credits int not null,
  status text not null default 'pending',
  credit_event_id uuid references grow_credit_events(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint grow_stripe_checkout_sessions_status_check check (
    status in ('pending', 'processing', 'completed', 'expired', 'failed')
  )
);

create table if not exists grow_usage_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_code text not null default 'starter',
  period_start timestamptz not null default date_trunc('month', now()),
  period_end timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  voice_minutes_limit numeric not null default 0,
  voice_tokens_limit bigint not null default 0,
  voice_spend_cents_limit int not null default 0,
  voice_minutes_used numeric not null default 0,
  voice_tokens_used bigint not null default 0,
  voice_spend_cents_used int not null default 0,
  hard_stop_enabled boolean not null default true,
  warning_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grow_usage_limits_non_negative check (
    voice_minutes_limit >= 0 and
    voice_tokens_limit >= 0 and
    voice_spend_cents_limit >= 0 and
    voice_minutes_used >= 0 and
    voice_tokens_used >= 0 and
    voice_spend_cents_used >= 0
  )
);

create table if not exists grow_usage_plan_defaults (
  plan_code text primary key,
  plan_label text not null,
  product_mode text not null,
  price_gbp_cents int not null,
  price_usd_cents int not null,
  voice_minutes_limit numeric not null,
  voice_tokens_limit bigint not null default 0,
  voice_spend_cents_limit int not null default 0,
  overage_gbp_cents_per_minute int not null default 30,
  overage_usd_cents_per_minute int not null default 40,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grow_usage_plan_defaults_product_mode_check check (
    product_mode in ('needs_website', 'has_website')
  )
);

create table if not exists grow_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_type text not null,
  provider text,
  provider_call_id text,
  voice_minutes numeric not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  total_tokens bigint not null default 0,
  spend_cents int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint grow_usage_events_agent_type_check check (
    agent_type in ('voice', 'lead', 'content', 'growth')
  )
);

alter table lead_campaigns
  add column if not exists credit_cost int not null default 0,
  add column if not exists credit_status text not null default 'none';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'lead_campaigns_credit_status_check'
  ) then
    alter table lead_campaigns
      add constraint lead_campaigns_credit_status_check
      check (credit_status in ('none', 'reserved', 'spent', 'refunded'));
  end if;
end $$;

create index if not exists grow_credit_events_user_idx on grow_credit_events(user_id, created_at desc);
create index if not exists grow_stripe_checkout_sessions_user_idx on grow_stripe_checkout_sessions(user_id, created_at desc);
create index if not exists grow_usage_events_user_idx on grow_usage_events(user_id, created_at desc);

drop trigger if exists set_grow_credit_accounts_updated_at on grow_credit_accounts;
create trigger set_grow_credit_accounts_updated_at
  before update on grow_credit_accounts
  for each row execute function set_updated_at();

drop trigger if exists set_grow_usage_limits_updated_at on grow_usage_limits;
create trigger set_grow_usage_limits_updated_at
  before update on grow_usage_limits
  for each row execute function set_updated_at();

drop trigger if exists set_grow_usage_plan_defaults_updated_at on grow_usage_plan_defaults;
create trigger set_grow_usage_plan_defaults_updated_at
  before update on grow_usage_plan_defaults
  for each row execute function set_updated_at();

insert into grow_usage_plan_defaults (
  plan_code,
  plan_label,
  product_mode,
  price_gbp_cents,
  price_usd_cents,
  voice_minutes_limit
)
values
  ('needs_website_starter', 'Starter', 'needs_website', 19700, 16700, 200),
  ('needs_website_growth', 'Growth', 'needs_website', 39700, 29700, 600),
  ('needs_website_scale', 'Scale', 'needs_website', 99700, 79700, 2000),
  ('has_website_starter', 'Starter', 'has_website', 9700, 6700, 200),
  ('has_website_growth', 'Growth', 'has_website', 29700, 19700, 600),
  ('has_website_scale', 'Scale', 'has_website', 79700, 69700, 2000)
on conflict (plan_code) do update
set
  plan_label = excluded.plan_label,
  product_mode = excluded.product_mode,
  price_gbp_cents = excluded.price_gbp_cents,
  price_usd_cents = excluded.price_usd_cents,
  voice_minutes_limit = excluded.voice_minutes_limit,
  overage_gbp_cents_per_minute = excluded.overage_gbp_cents_per_minute,
  overage_usd_cents_per_minute = excluded.overage_usd_cents_per_minute;

create or replace function reserve_grow_credits(
  p_user_id uuid,
  p_amount int,
  p_metadata jsonb default '{}'::jsonb
)
returns table(event_id uuid, available_credits int, reserved_credits int)
language plpgsql
security definer
as $$
declare
  v_account grow_credit_accounts%rowtype;
  v_event_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'credit amount must be positive';
  end if;

  insert into grow_credit_accounts (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_account
  from grow_credit_accounts
  where user_id = p_user_id
  for update;

  if v_account.available_credits < p_amount then
    raise exception 'insufficient_credits';
  end if;

  update grow_credit_accounts
  set
    available_credits = available_credits - p_amount,
    reserved_credits = reserved_credits + p_amount
  where user_id = p_user_id
  returning * into v_account;

  insert into grow_credit_events (user_id, event_type, amount, balance_after, metadata)
  values (p_user_id, 'reserve', -p_amount, v_account.available_credits, p_metadata)
  returning id into v_event_id;

  return query select v_event_id, v_account.available_credits, v_account.reserved_credits;
end;
$$;

create or replace function grant_grow_credits(
  p_user_id uuid,
  p_amount int,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_account grow_credit_accounts%rowtype;
  v_event_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'credit amount must be positive';
  end if;

  insert into grow_credit_accounts (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  update grow_credit_accounts
  set
    available_credits = available_credits + p_amount,
    lifetime_credits_granted = lifetime_credits_granted + p_amount
  where user_id = p_user_id
  returning * into v_account;

  insert into grow_credit_events (user_id, event_type, amount, balance_after, metadata)
  values (p_user_id, 'grant', p_amount, v_account.available_credits, p_metadata)
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function spend_reserved_grow_credits(
  p_user_id uuid,
  p_campaign_id uuid,
  p_amount int,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_account grow_credit_accounts%rowtype;
  v_event_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'credit amount must be positive';
  end if;

  select * into v_account
  from grow_credit_accounts
  where user_id = p_user_id
  for update;

  if v_account.reserved_credits < p_amount then
    raise exception 'not_enough_reserved_credits';
  end if;

  update grow_credit_accounts
  set
    reserved_credits = reserved_credits - p_amount,
    lifetime_credits_spent = lifetime_credits_spent + p_amount
  where user_id = p_user_id
  returning * into v_account;

  update lead_campaigns
  set credit_status = 'spent'
  where id = p_campaign_id;

  insert into grow_credit_events (user_id, campaign_id, event_type, amount, balance_after, metadata)
  values (p_user_id, p_campaign_id, 'spend', -p_amount, v_account.available_credits, p_metadata)
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function refund_reserved_grow_credits(
  p_user_id uuid,
  p_campaign_id uuid,
  p_amount int,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_account grow_credit_accounts%rowtype;
  v_event_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'credit amount must be positive';
  end if;

  select * into v_account
  from grow_credit_accounts
  where user_id = p_user_id
  for update;

  if v_account.reserved_credits < p_amount then
    raise exception 'not_enough_reserved_credits';
  end if;

  update grow_credit_accounts
  set
    available_credits = available_credits + p_amount,
    reserved_credits = reserved_credits - p_amount
  where user_id = p_user_id
  returning * into v_account;

  update lead_campaigns
  set credit_status = 'refunded'
  where id = p_campaign_id;

  insert into grow_credit_events (user_id, campaign_id, event_type, amount, balance_after, metadata)
  values (p_user_id, p_campaign_id, 'refund', p_amount, v_account.available_credits, p_metadata)
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function consume_voice_usage(
  p_user_id uuid,
  p_provider text,
  p_provider_call_id text,
  p_voice_minutes numeric,
  p_input_tokens bigint,
  p_output_tokens bigint,
  p_spend_cents int,
  p_metadata jsonb default '{}'::jsonb
)
returns grow_usage_limits
language plpgsql
security definer
as $$
declare
  v_limits grow_usage_limits%rowtype;
  v_total_tokens bigint;
begin
  v_total_tokens := greatest(0, coalesce(p_input_tokens, 0)) + greatest(0, coalesce(p_output_tokens, 0));

  insert into grow_usage_limits (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_limits
  from grow_usage_limits
  where user_id = p_user_id
  for update;

  if now() >= v_limits.period_end then
    update grow_usage_limits
    set
      period_start = date_trunc('month', now()),
      period_end = date_trunc('month', now()) + interval '1 month',
      voice_minutes_used = 0,
      voice_tokens_used = 0,
      voice_spend_cents_used = 0,
      warning_sent_at = null
    where user_id = p_user_id
    returning * into v_limits;
  end if;

  if v_limits.hard_stop_enabled and (
    (v_limits.voice_minutes_limit > 0 and v_limits.voice_minutes_used + p_voice_minutes > v_limits.voice_minutes_limit) or
    (v_limits.voice_tokens_limit > 0 and v_limits.voice_tokens_used + v_total_tokens > v_limits.voice_tokens_limit) or
    (v_limits.voice_spend_cents_limit > 0 and v_limits.voice_spend_cents_used + p_spend_cents > v_limits.voice_spend_cents_limit)
  ) then
    raise exception 'usage_limit_exceeded';
  end if;

  update grow_usage_limits
  set
    voice_minutes_used = voice_minutes_used + greatest(0, coalesce(p_voice_minutes, 0)),
    voice_tokens_used = voice_tokens_used + v_total_tokens,
    voice_spend_cents_used = voice_spend_cents_used + greatest(0, coalesce(p_spend_cents, 0))
  where user_id = p_user_id
  returning * into v_limits;

  insert into grow_usage_events (
    user_id,
    agent_type,
    provider,
    provider_call_id,
    voice_minutes,
    input_tokens,
    output_tokens,
    total_tokens,
    spend_cents,
    metadata
  )
  values (
    p_user_id,
    'voice',
    p_provider,
    p_provider_call_id,
    greatest(0, coalesce(p_voice_minutes, 0)),
    greatest(0, coalesce(p_input_tokens, 0)),
    greatest(0, coalesce(p_output_tokens, 0)),
    v_total_tokens,
    greatest(0, coalesce(p_spend_cents, 0)),
    p_metadata
  );

  return v_limits;
end;
$$;

create or replace function apply_grow_usage_plan(
  p_user_id uuid,
  p_plan_code text,
  p_voice_tokens_limit bigint default null,
  p_voice_spend_cents_limit int default null
)
returns grow_usage_limits
language plpgsql
security definer
as $$
declare
  v_plan grow_usage_plan_defaults%rowtype;
  v_limits grow_usage_limits%rowtype;
begin
  select * into v_plan
  from grow_usage_plan_defaults
  where plan_code = p_plan_code;

  if not found then
    raise exception 'unknown_usage_plan';
  end if;

  insert into grow_usage_limits (
    user_id,
    plan_code,
    period_start,
    period_end,
    voice_minutes_limit,
    voice_tokens_limit,
    voice_spend_cents_limit,
    hard_stop_enabled
  )
  values (
    p_user_id,
    p_plan_code,
    date_trunc('month', now()),
    date_trunc('month', now()) + interval '1 month',
    v_plan.voice_minutes_limit,
    coalesce(p_voice_tokens_limit, v_plan.voice_tokens_limit),
    coalesce(p_voice_spend_cents_limit, v_plan.voice_spend_cents_limit),
    true
  )
  on conflict (user_id) do update
  set
    plan_code = excluded.plan_code,
    voice_minutes_limit = excluded.voice_minutes_limit,
    voice_tokens_limit = excluded.voice_tokens_limit,
    voice_spend_cents_limit = excluded.voice_spend_cents_limit,
    hard_stop_enabled = true
  returning * into v_limits;

  return v_limits;
end;
$$;

alter table grow_credit_accounts enable row level security;
alter table grow_credit_events enable row level security;
alter table grow_stripe_checkout_sessions enable row level security;
alter table grow_usage_limits enable row level security;
alter table grow_usage_plan_defaults enable row level security;
alter table grow_usage_events enable row level security;

drop policy if exists "users see own credit account" on grow_credit_accounts;
create policy "users see own credit account" on grow_credit_accounts
  for select using (auth.uid() = user_id);

drop policy if exists "users see own credit events" on grow_credit_events;
create policy "users see own credit events" on grow_credit_events
  for select using (auth.uid() = user_id);

drop policy if exists "users see own stripe sessions" on grow_stripe_checkout_sessions;
create policy "users see own stripe sessions" on grow_stripe_checkout_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "users see own usage limits" on grow_usage_limits;
create policy "users see own usage limits" on grow_usage_limits
  for select using (auth.uid() = user_id);

drop policy if exists "public can read usage plan defaults" on grow_usage_plan_defaults;
create policy "public can read usage plan defaults" on grow_usage_plan_defaults
  for select using (true);

drop policy if exists "users see own usage events" on grow_usage_events;
create policy "users see own usage events" on grow_usage_events
  for select using (auth.uid() = user_id);

-- Service role bypasses RLS for API, cron and Stripe webhook routes.
