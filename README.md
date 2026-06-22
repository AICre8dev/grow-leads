# Grow Leads Agent

Lead-generation agent control room for GrowAgents.co. Grow Leads Agent sources local businesses, builds AICre8 preview sites, queues outreach, and tracks the economics of each campaign.

This repo is still early, but the direction is intentional: agents are the product. The dashboard is the operator console, campaigns are agent jobs, and usage/credits are the first fee rails. A future token or onchain fee layer could sit on top of that once the core agent revenue loop works reliably.

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind (port 5181)
- **Backend:** Cloudflare Pages Functions (`functions/api/lead-engine/*`)
- **DB:** Supabase (shares the Grow project for portability)
- **Scraping:** Apify `compass~crawler-google-places` (~$0.002/place)
- **Site builds:** AICre8 API
- **Email:** Resend

## Setup

### 1. Install

```bash
npm install
cp .dev.vars.example .dev.vars
# fill in values (see below)
```

### 2. Required keys

| Variable | How to get it |
| --- | --- |
| `APIFY_TOKEN` | apify.com → Settings → Integrations → API token |
| `RESEND_API_KEY` | resend.com → API Keys |
| `AICRE8_API_KEY` | aicre8.dev → Settings → API Keys (`ak_live_...`) |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | copy from your existing Grow Supabase project |
| `EMAIL_FROM` | a Resend-verified sender address |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret for `/api/stripe/webhook` |
| `GROW_DEMO_USER_ID` | optional Supabase auth user UUID for local/dev fallback |

### 3. Apply DB schema

In Supabase SQL editor, run:
```
supabase/migrations/20260421000000_grow_leads.sql
supabase/migrations/20260517000000_grow_credits_stripe.sql
supabase/migrations/20260518000000_grow_dashboard_usage.sql
supabase/migrations/20260608000000_lead_campaign_client_name.sql
supabase/migrations/20260610000000_grow_research_inbox.sql
```

### 3.1 Stripe credit packs

Grow Leads Agent creates Stripe Checkout sessions with inline price data for the same overage packs as AICre8:

- 100 credits: `$39`
- 500 credits: `$149`
- 2,000 credits: `$499`

Stripe should call:

```
POST https://<your-domain>/api/stripe/webhook
```

Subscribe the webhook to `checkout.session.completed`. Credits are granted only by the webhook after Stripe confirms the session is paid.

### 4. Dev

```bash
npm run dev              # frontend only (mock data)
npm run build
cp .dev.vars.example .dev.vars
npm run dev:functions    # built frontend + backend functions via wrangler on :8788
```

### 5. Deploy

```bash
npm run deploy
```

Deploys to `grow-leads.pages.dev` for now. Set the same env vars in Cloudflare Pages dashboard → Settings → Environment Variables.

### 6. Cron

Pages Functions doesn't run cron natively. Options:
- **GitHub Actions** (free): cron workflow hitting `POST /api/lead-engine/cron/process` every 2 min with `x-cron-secret` header
- **cron-job.org** (free): schedule same POST
- **Separate CF Worker** (cleanest long-term): `wrangler.toml` has cron trigger scaffolded

## API routes

- `GET /api/lead-engine/campaigns` — list
- `POST /api/lead-engine/campaigns` — create + kick off Apify
- `GET /api/lead-engine/campaigns/:id` — detail + leads
- `POST /api/lead-engine/cron/process` — process pipeline (cron-protected)
- `GET /api/grow/credits` — current credit balance + available Stripe packs
- `POST /api/grow/credits/checkout` — create Stripe Checkout session for a credit pack
- `GET /api/grow/usage` — current monthly Grow Leads Agent usage, recent events and top-up history
- `POST /api/grow/usage/consume` — record usage and reject only provider/voice safety cap breaches
- `POST /api/stripe/webhook` — Stripe Checkout webhook, grants paid credits

## Voice usage guardrails

Voice agents should report every call segment into `consume_voice_usage` with minutes, input tokens, output tokens and estimated spend. The DB hard-stops usage when a user would exceed their configured monthly minutes, token, or spend limit, which prevents silent overspend from long calls or runaway agent loops.

Grow Leads Agent plan allowances are tracked in `grow_usage_balances`:

- Starter: $49/mo, 1 client, 100 credits/month, 200 voice minutes/month
- Agency: $149/mo, 5 clients, 500 credits/month, 600 voice minutes/month
- Agency Pro: $349/mo, 20 clients, 2,000 credits/month, 2,000 voice minutes/month

Credits are metering/overage signals, not a default dashboard gate. Voice minutes and provider spend have hard safety caps so runaway calls, token use, scraping or API spend cannot silently burn margin.

## Pipeline states

```
pending → scraping → building → added_to_crm → email_sent
                                      ↓
                                   failed
```

## Current integration note

The frontend now calls the local `/api/lead-engine/*` and `/api/grow/*` routes instead of mock data. The AICre8 helper uses the public v1 project flow: create project → generate → build → collect `dist` files → deploy. The Research Inbox uses `/api/grow/research` once `20260610000000_grow_research_inbox.sql` is applied; until then the UI falls back to a starter research queue.

## Token thesis

The near-term product should stay boring and useful: agents that create measurable revenue. The longer-term crypto shape is optional but plausible:

- Agent jobs spend credits and produce campaign revenue signals.
- Fee rails can be made visible per campaign, per agent, and per operator.
- If a token ever exists, it should attach to real agent revenue or fee sharing rather than launch before the workflow earns.
- The GitHub repo can stay cloneable and useful without crypto; the token layer should be an extension, not a dependency.

## Porting to Grow later

1. Copy `src/components/*` → Grow's `/components/lead-engine/`
2. Copy `functions/api/lead-engine/*` → Grow's `functions/api/lead-engine/`
3. Copy `functions/_shared/*` (merge with existing `_shared`)
4. Add nav link in Grow sidebar
5. DB is already shared — no migration needed
