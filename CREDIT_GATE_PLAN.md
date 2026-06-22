# Grow Credit Gate Plan

## Goal

Gate lead-agent usage behind user credits so every campaign consumes a predictable amount of Grow credit before paid work starts. The first protected action should be campaign creation, because that is where external cost begins: Apify scraping, preview site generation, CRM work, and outreach.

## Product Rules

- Credits belong to a user account first. Agency/client workspace credit pooling can come later.
- Dashboard access is not credit-gated.
- Client creation is gated by plan client allowance, not credits.
- Credits meter usage, overage, alerts and margin protection.
- Voice agents must also have monthly usage limits for minutes, model tokens, and estimated spend.
- Voice/provider usage must hard-stop before a new call/tool run would push the user over a safety cap.
- Admin/service-role code can grant, adjust, or refund credits with an audit reason.

## Grow Plans

| Plan | Price | Clients | Grow credits/month | Voice minutes/month |
| --- | ---: | ---: | ---: | ---: |
| Starter | $49/mo | 1 | 100 | 200 |
| Agency | $149/mo | 5 | 500 | 600 |
| Agency Pro | $349/mo | 20 | 2,000 | 2,000 |

## Top-Up Packs

Use the AICre8 overage packs:

| Pack | Credits | Price |
| --- | ---: | ---: |
| Small | 100 | $39 |
| Medium | 500 | $149 |
| Large | 2,000 | $499 |

## User Flow

1. User opens the Lead generation agents dashboard.
2. Dashboard shows credit balance near the launch form.
3. User selects niche, city, and number of leads.
4. Form shows estimated cost as the lead count changes.
5. If the user has enough credits, the launch button starts the campaign.
6. If the user does not have enough credits, the launch button changes to an add-credits action.
7. API re-checks credits server-side and rejects insufficient balances with `402 Payment Required`.
8. Toast explains the exact shortfall.

## Data Model

Add a dedicated credit ledger instead of storing a mutable balance only. The ledger gives us auditability and prevents confusing support/debug sessions later.

```sql
create table grow_credit_accounts (
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

create table grow_credit_events (
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

create table grow_usage_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_code text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  voice_minutes_limit numeric not null,
  voice_tokens_limit bigint not null,
  voice_spend_cents_limit int not null,
  voice_minutes_used numeric not null default 0,
  voice_tokens_used bigint not null default 0,
  voice_spend_cents_used int not null default 0,
  hard_stop_enabled boolean not null default true
);

create table grow_usage_events (
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
  created_at timestamptz not null default now()
);
```

Add to `lead_campaigns`:

```sql
credit_cost int not null default 0,
credit_status text not null default 'none'
  check (credit_status in ('none', 'reserved', 'spent', 'refunded'))
```

## Server Design

Create a shared credit helper used by API routes and cron:

- `getCreditAccount(userId)`
- `reserveCredits(userId, amount, metadata)`
- `attachReservationToCampaign(eventId, campaignId)`
- `spendReservedCredits(userId, campaignId, amount)`
- `refundReservedCredits(userId, campaignId, amount, reason)`
- `consumeVoiceUsage(userId, provider, callId, minutes, inputTokens, outputTokens, spendCents)`

Campaign creation should become an atomic sequence:

1. Validate user identity.
2. Clamp and validate `leadCount`.
3. Reserve `leadCount` credits in a database transaction/RPC.
4. Insert `lead_campaigns` with `credit_cost` and `credit_status = 'reserved'`.
5. Start Apify.
6. Store `apifyRunId` in campaign stats.

Important ordering note: reserve before external work starts. If campaign insert or Apify start fails, refund the reservation immediately.

Voice agent ordering note: check remaining limits before accepting/continuing a call, then record actual provider usage after each call segment. If the next segment would exceed minutes, tokens, or spend, stop the call gracefully and route to fallback/contact capture.

## API Contract

Add:

- `GET /api/grow/credits`
  - returns `{ availableCredits, reservedCredits, lifetimeCreditsSpent }`
- `POST /api/grow/credits/grant`
  - admin-only or service-only for manual/internal grants

Update:

- `POST /api/lead-engine/campaigns`
  - returns `402` with `{ error, availableCredits, requiredCredits, shortfall }` when blocked
  - returns campaign plus updated credit summary when successful

## Frontend Changes

Add to `src/types.ts`:

```ts
export interface CreditSummary {
  availableCredits: number;
  reservedCredits: number;
  lifetimeCreditsSpent: number;
}
```

Dashboard launch form changes:

- Show available credits in the top-right launch-form status pill.
- Show `Cost: X credits` beside the lead slider value.
- Disable launch when `totalLeads > availableCredits`.
- Change disabled CTA copy to `Add credits to launch`.
- On API `402`, show `You need N more credits to launch this campaign.`

## Rollout Phases

1. **Plan and schema**
   - Add credit account, ledger, and campaign credit fields.
   - Add RLS so users can read only their own credit account and events.
2. **Server enforcement**
   - Add credit helper/RPC.
   - Gate campaign creation before Apify starts.
   - Refund reservations on campaign-start failures.
3. **Frontend gate**
   - Fetch credit summary on app load and after campaign creation.
   - Add balance/cost display and blocked launch state.
4. **Operations**
   - Add service/admin grant path.
   - Add seed credits for existing testers.
   - Add support queries for ledger history.
5. **Billing upgrade**
   - Connect add-credits CTA to Stripe Checkout.
   - Convert successful purchases into `grant` ledger events.

## Open Questions

- Should a credit buy only a scraped lead, or a fully processed lead with preview site and outreach?
- Do unused leads refund automatically when fewer qualifying businesses are found?
- Should credits live at user, agency, or client-workspace level for GrowAgents?
- What starter allocation should new users receive?
- What exact Stripe prices should map to the 50, 250, and 1000 credit packs?
- What are the final internal token/spend caps for each voice plan?
- Should clients be allowed to buy automatic overage packs, or should hard-stop be mandatory?

## Voice Usage Limits

GrowAgents pricing source: `https://www.growagents.co`.

Verified public voice-minute limits:

| Mode | Plan | GBP | USD | Included voice minutes |
| --- | --- | ---: | ---: | ---: |
| Needs website | Starter | £197/mo | $167/mo | 200 |
| Needs website | Growth | £397/mo | $297/mo | 600 |
| Needs website | Scale | £997/mo | $797/mo | 2,000 |
| Has website | Starter | £97/mo | $67/mo | 200 |
| Has website | Growth | £297/mo | $197/mo | 600 |
| Has website | Scale | £797/mo | $697/mo | 2,000 |

Public overage and alert rules:

- Voice minutes refresh monthly.
- Additional minutes are `£0.30/min` or `$0.40/min`.
- Usage alerts fire at `80%` and `100%`.
- Founder pricing says Growth can be locked at `£297/mo` for life for the limited cohort.

The public site exposes voice-minute caps, but not raw provider token caps. Keep token and spend caps internal/configurable in `grow_usage_limits` so long calls, retries, or model loops cannot quietly overrun the margin.

Recommended enforcement:

- Track voice minutes, input tokens, output tokens, total tokens, and estimated provider spend for every call.
- Use `hard_stop_enabled = true` by default.
- Stop voice calls before the next segment would exceed the plan minute cap, token cap, or spend cap.
- Warn users at 80 percent of minutes, tokens, or spend.
- Show remaining usage in the GrowAgents client workspace near the AI Receptionist module.
- Keep token/cost limits internal-facing if customers should think in minutes/credits rather than raw model tokens.

Plan minute caps are seeded in `grow_usage_plan_defaults`. When a user subscribes or is assigned a plan, call `apply_grow_usage_plan(user_id, plan_code, token_cap, spend_cap)` to set the monthly hard limits.

## Stripe Integration

Use Stripe Checkout for credit pack purchases. The app creates Checkout Sessions with the selected pack ID, user ID, and credit amount stored in metadata. The frontend redirects the user to Stripe. The Stripe webhook listens for `checkout.session.completed`, verifies the signature, retrieves the session, confirms `payment_status = paid`, then grants credits through the ledger.

Required environment:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_50_CREDITS`
- `STRIPE_PRICE_250_CREDITS`
- `STRIPE_PRICE_1000_CREDITS`

Credit grants must remain webhook-only. The checkout return URL can refresh the balance, but it should not grant credits by itself.

## Recommended First Implementation

Start with user-level credits and a one-credit-per-requested-lead rule. It is simple enough for users to understand, cheap to enforce, and compatible with agency-level pooling later because the ledger can be extended with `agency_id` without replacing the campaign gate.
