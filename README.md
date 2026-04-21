# Grow Leads

Lead-gen tool for [Grow Agency](https://project-kbngop-mn1y6bcm.aicre8.app). Scrapes local businesses without websites, auto-builds preview sites via AICre8, sends outreach emails.

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
cp .env.example .env
# fill in values (see below)
```

### 2. Required keys

| Variable | How to get it |
| --- | --- |
| `APIFY_TOKEN` | apify.com → Settings → Integrations → API token |
| `RESEND_API_KEY` | resend.com → API Keys |
| `AICRE8_API_KEY` | aicre8.dev → account settings (ask @aicre8dev) |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | copy from your existing Grow Supabase project |
| `EMAIL_FROM` | a Resend-verified sender address |
| `CRON_SECRET` | `openssl rand -hex 32` |

### 3. Apply DB schema

In Supabase SQL editor, run:
```
supabase/migrations/20260421000000_grow_leads.sql
```

### 4. Dev

```bash
npm run dev              # frontend only (mock data)
npm run dev:functions    # frontend + backend functions via wrangler
```

### 5. Deploy

```bash
npm run deploy
```

Deploys to `grow-leads.pages.dev`. Set the same env vars in Cloudflare Pages dashboard → Settings → Environment Variables.

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

## Pipeline states

```
pending → scraping → building → added_to_crm → email_sent
                                      ↓
                                   failed
```

## Porting to Grow later

1. Copy `src/components/*` → Grow's `/components/lead-engine/`
2. Copy `functions/api/lead-engine/*` → Grow's `functions/api/lead-engine/`
3. Copy `functions/_shared/*` (merge with existing `_shared`)
4. Add nav link in Grow sidebar
5. DB is already shared — no migration needed
