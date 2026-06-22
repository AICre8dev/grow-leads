-- Grow Dashboard usage balances, events and top-up purchases.

create table if not exists grow_usage_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'starter',
  period_start timestamptz not null default date_trunc('month', now()),
  period_end timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  grow_credits_total numeric(12, 2) not null default 100,
  grow_credits_used numeric(12, 2) not null default 0,
  voice_minutes_total numeric(12, 2) not null default 200,
  voice_minutes_used numeric(12, 2) not null default 0,
  client_limit int not null default 1,
  client_count int not null default 0,
  hard_spend_limit_cents int not null default 15000,
  provider_spend_cents int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grow_usage_balances_plan_check check (plan in ('starter', 'agency', 'agency_pro')),
  constraint grow_usage_balances_non_negative check (
    grow_credits_total >= 0 and
    grow_credits_used >= 0 and
    voice_minutes_total >= 0 and
    voice_minutes_used >= 0 and
    client_limit >= 0 and
    client_count >= 0 and
    hard_spend_limit_cents >= 0 and
    provider_spend_cents >= 0
  ),
  unique (user_id, period_start)
);

create table if not exists grow_credit_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_session_id text not null unique,
  pack text not null,
  credits int not null,
  amount_cents int not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint grow_credit_purchases_pack_check check (pack in ('small', 'medium', 'large')),
  constraint grow_credit_purchases_status_check check (
    status in ('pending', 'processing', 'completed', 'expired', 'failed')
  )
);

alter table grow_usage_events
  add column if not exists agent_type text not null default 'growth',
  add column if not exists provider text,
  add column if not exists provider_call_id text,
  add column if not exists voice_minutes numeric not null default 0,
  add column if not exists input_tokens bigint not null default 0,
  add column if not exists output_tokens bigint not null default 0,
  add column if not exists total_tokens bigint not null default 0,
  add column if not exists spend_cents int not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists client_id uuid,
  add column if not exists event_type text,
  add column if not exists credits_delta numeric(12, 2) not null default 0,
  add column if not exists voice_minutes_delta numeric(12, 2) not null default 0,
  add column if not exists provider_spend_cents int not null default 0,
  add column if not exists provider_tokens_input bigint,
  add column if not exists provider_tokens_output bigint;

alter table grow_usage_events
  alter column agent_type set default 'growth';

create index if not exists grow_usage_balances_user_period_idx
  on grow_usage_balances(user_id, period_start desc);

create index if not exists grow_credit_purchases_user_idx
  on grow_credit_purchases(user_id, created_at desc);

create index if not exists grow_usage_events_client_idx
  on grow_usage_events(client_id, created_at desc);

drop trigger if exists set_grow_usage_balances_updated_at on grow_usage_balances;
create trigger set_grow_usage_balances_updated_at
  before update on grow_usage_balances
  for each row execute function set_updated_at();

create or replace function grow_plan_allowances(
  p_plan text,
  out grow_credits_total numeric,
  out voice_minutes_total numeric,
  out client_limit int,
  out hard_spend_limit_cents int
)
language plpgsql
stable
as $$
begin
  case p_plan
    when 'agency_pro' then
      grow_credits_total := 2000;
      voice_minutes_total := 2000;
      client_limit := 20;
      hard_spend_limit_cents := 120000;
    when 'agency' then
      grow_credits_total := 500;
      voice_minutes_total := 600;
      client_limit := 5;
      hard_spend_limit_cents := 45000;
    else
      grow_credits_total := 100;
      voice_minutes_total := 200;
      client_limit := 1;
      hard_spend_limit_cents := 15000;
  end case;
end;
$$;

create or replace function ensure_grow_usage_balance(
  p_user_id uuid,
  p_plan text default 'starter'
)
returns grow_usage_balances
language plpgsql
security definer
as $$
declare
  v_period_start timestamptz;
  v_balance grow_usage_balances%rowtype;
  v_allowances record;
begin
  v_period_start := date_trunc('month', now());

  select * into v_balance
  from grow_usage_balances
  where user_id = p_user_id and period_start = v_period_start;

  if found then
    return v_balance;
  end if;

  select * into v_allowances from grow_plan_allowances(p_plan);

  insert into grow_usage_balances (
    user_id,
    plan,
    period_start,
    period_end,
    grow_credits_total,
    voice_minutes_total,
    client_limit,
    hard_spend_limit_cents
  )
  values (
    p_user_id,
    p_plan,
    v_period_start,
    v_period_start + interval '1 month',
    v_allowances.grow_credits_total,
    v_allowances.voice_minutes_total,
    v_allowances.client_limit,
    v_allowances.hard_spend_limit_cents
  )
  returning * into v_balance;

  return v_balance;
end;
$$;

create or replace function consume_grow_usage(
  p_user_id uuid,
  p_client_id uuid,
  p_event_type text,
  p_quantity numeric default 1,
  p_credits_delta numeric default 0,
  p_voice_minutes_delta numeric default 0,
  p_provider_spend_cents int default 0,
  p_provider_tokens_input bigint default null,
  p_provider_tokens_output bigint default null,
  p_metadata jsonb default '{}'::jsonb
)
returns grow_usage_balances
language plpgsql
security definer
as $$
declare
  v_balance grow_usage_balances%rowtype;
  v_next_voice numeric;
  v_next_spend int;
  v_total_tokens bigint;
begin
  v_balance := ensure_grow_usage_balance(p_user_id, 'starter');

  select * into v_balance
  from grow_usage_balances
  where id = v_balance.id
  for update;

  v_next_voice := v_balance.voice_minutes_used + greatest(0, coalesce(p_voice_minutes_delta, 0));
  v_next_spend := v_balance.provider_spend_cents + greatest(0, coalesce(p_provider_spend_cents, 0));

  if v_balance.voice_minutes_total > 0 and v_next_voice > v_balance.voice_minutes_total then
    raise exception 'voice_limit_exceeded';
  end if;

  if v_balance.hard_spend_limit_cents > 0 and v_next_spend > v_balance.hard_spend_limit_cents then
    raise exception 'provider_spend_limit_exceeded';
  end if;

  update grow_usage_balances
  set
    grow_credits_used = grow_credits_used + greatest(0, coalesce(p_credits_delta, 0)),
    voice_minutes_used = v_next_voice,
    provider_spend_cents = v_next_spend
  where id = v_balance.id
  returning * into v_balance;

  v_total_tokens := greatest(0, coalesce(p_provider_tokens_input, 0)) +
    greatest(0, coalesce(p_provider_tokens_output, 0));

  insert into grow_usage_events (
    user_id,
    client_id,
    agent_type,
    event_type,
    credits_delta,
    voice_minutes_delta,
    provider_spend_cents,
    provider_tokens_input,
    provider_tokens_output,
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
    p_client_id,
    case when p_voice_minutes_delta > 0 then 'voice' else 'growth' end,
    p_event_type,
    greatest(0, coalesce(p_credits_delta, 0)),
    greatest(0, coalesce(p_voice_minutes_delta, 0)),
    greatest(0, coalesce(p_provider_spend_cents, 0)),
    p_provider_tokens_input,
    p_provider_tokens_output,
    coalesce(p_metadata->>'provider', null),
    coalesce(p_metadata->>'providerCallId', null),
    greatest(0, coalesce(p_voice_minutes_delta, 0)),
    greatest(0, coalesce(p_provider_tokens_input, 0)),
    greatest(0, coalesce(p_provider_tokens_output, 0)),
    v_total_tokens,
    greatest(0, coalesce(p_provider_spend_cents, 0)),
    jsonb_set(p_metadata, '{quantity}', to_jsonb(coalesce(p_quantity, 1)), true)
  );

  return v_balance;
end;
$$;

create or replace function grant_purchased_grow_credits(
  p_user_id uuid,
  p_credits int
)
returns grow_usage_balances
language plpgsql
security definer
as $$
declare
  v_balance grow_usage_balances%rowtype;
begin
  v_balance := ensure_grow_usage_balance(p_user_id, 'starter');

  update grow_usage_balances
  set grow_credits_total = grow_credits_total + p_credits
  where id = v_balance.id
  returning * into v_balance;

  return v_balance;
end;
$$;

alter table grow_usage_balances enable row level security;
alter table grow_credit_purchases enable row level security;

drop policy if exists "users see own usage balances" on grow_usage_balances;
create policy "users see own usage balances" on grow_usage_balances
  for select using (auth.uid() = user_id);

drop policy if exists "users see own credit purchases" on grow_credit_purchases;
create policy "users see own credit purchases" on grow_credit_purchases
  for select using (auth.uid() = user_id);
