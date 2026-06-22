# Grow Leads Agent Handover

Last updated: 20 June 2026

## Current State

Grow Leads Agent is live at:

- Production: https://grow-leads.pages.dev/
- Latest preview from this handover pass: https://7d584071.grow-leads.pages.dev/

The app is a customer and investor acquisition tool. For now it is intended for the owner/operator to use directly to get customers and investors, not as a broad public self-serve product.

The dashboard now opens with the Find / Agent Launch form at the top. Pricing is a separate page and should not appear inside the launch workflow.

## Product Decisions To Preserve

- The first visible dashboard surface should be the Agent Launch / Find form.
- Pricing belongs on the separate Pricing page only.
- Do not put `100 / 500 / 2000 credits` pack buttons inside the Find / Agent Launch form.
- The dashboard can show usage status and credit availability, but it should not feel like a checkout surface.
- Research has two distinct modes: Customer Mode and Investor Mode. They should look and feel clearly different.
- The Google Rank Boost offer is not for this tool. It belongs to the AICre8 dev / cgrow dashboard.
- See `AICRE8_CGROW_RANK_BOOST_HANDOFF.md` before doing any further Rank Boost work.
- Pricing should not be hero content on the dashboard. Keep the work flow first.

## Recent Changes

- Moved `NewCampaignInline` above the dashboard overview, usage panel, command center, and campaigns list.
- Removed credit-pack purchase buttons from `NewCampaignInline`.
- Changed the launch-form badge from `top-up credits` to `available credits`.
- Removed dashboard `Buy credits`, `Buy more credits`, and `Upgrade` purchase prompts.
- Added/kept a standalone `PricingPage` with:
  - Starter: `$49/mo`, 1 client, 100 credits/month, 200 voice minutes/month.
  - Agency: `$149/mo`, 5 clients, 500 credits/month, 600 voice minutes/month.
  - Agency Pro: `$349/mo`, 20 clients, 2,000 credits/month, 2,000 voice minutes/month.
  - One-time top-ups: 100 credits `$39`, 500 credits `$149`, 2,000 credits `$499`.
- Added visually different customer/investor research experiences in `ResearchInbox`.
- Removed the local Rank Boost plan component and docs from this app.
- Added `AICRE8_CGROW_RANK_BOOST_HANDOFF.md` to point future agents to the AICre8/cgrow SEO audit engine instead of restoring Rank Boost here.

## Important Files

- `src/App.tsx`: top-level page state and API orchestration.
- `src/components/Dashboard.tsx`: dashboard layout, usage panel, command center, campaigns list.
- `src/components/NewCampaignInline.tsx`: primary Find / Agent Launch form. This should stay first on the dashboard.
- `src/components/AgentCommandCenter.tsx`: natural-language campaign planner.
- `src/components/ResearchInbox.tsx`: Customer Mode / Investor Mode research UI.
- `src/components/PricingPage.tsx`: plans and credit top-up purchase UI.
- `src/components/Navbar.tsx`: Dashboard, Research, Pricing, Settings navigation.
- `src/lib/api.ts`: frontend API client.
- `functions/api/lead-engine/*`: campaign creation/detail/cron pipeline.
- `functions/api/grow/*`: credits, usage, and research APIs.
- `functions/api/stripe/webhook.ts`: Stripe checkout webhook for credit grants.
- `supabase/migrations/*grow*`: database schema for campaigns, credits, usage, clients, and research.

## Commands

Local frontend:

```bash
npm run dev
```

Lint:

```bash
npm run lint
```

Production build:

```bash
npm run build
```

Deploy:

```bash
npm run deploy
```

Equivalent direct deploy used during this session:

```bash
wrangler pages deploy ./dist --project-name=grow-leads --branch=main
```

## Verification Completed

- `npm run lint` passed.
- `npm run build` passed.
- Production dashboard checked after deploy:
  - Agent Launch is present at the top.
  - Dashboard does not show `100 credits`, `500 credits`, or `2,000 credits` pack buttons.
  - Dashboard does not show `top-up credits`.
  - Dashboard does not show `Buy credits` or `Buy more credits`.
- Production Pricing page checked after deploy:
  - Starter, Agency, and Agency Pro plans are visible.
  - 100, 500, and 2,000 credit top-up packs are visible.

## Current Git State

There are many uncommitted tracked and untracked changes in this repo from the current build-out. Do not run destructive cleanup commands unless the owner explicitly asks.

Notable untracked files/directories include:

- `src/components/AgentCommandCenter.tsx`
- `src/components/PricingPage.tsx`
- `src/components/ResearchInbox.tsx`
- `src/data/researchInbox.ts`
- `functions/_shared/auth.ts`
- `functions/_shared/credits.ts`
- `functions/_shared/growPlans.ts`
- `functions/_shared/stripe.ts`
- `functions/_shared/usage.ts`
- `functions/api/grow/`
- `functions/api/stripe/`
- `supabase/migrations/20260517000000_grow_credits_stripe.sql`
- `supabase/migrations/20260518000000_grow_dashboard_usage.sql`
- `supabase/migrations/20260608000000_lead_campaign_client_name.sql`
- `supabase/migrations/20260610000000_grow_research_inbox.sql`

Before making a release commit, review the full diff carefully and stage intentionally.

## Known Gaps / Next Work

- Pricing plan subscription checkout is mostly presentation right now. Credit top-ups have checkout wiring, but monthly plan purchase/upgrade flows need product and Stripe decisions.
- Navigation is React page state, not deep-link routing. Pricing is reachable from nav, but not by a stable `/pricing` URL unless routing is added.
- Agent command parsing is lightweight and heuristic. It is good for a demo/operator workflow, but not a robust natural-language planner.
- Cron processing still requires an external trigger for `POST /api/lead-engine/cron/process`.
- Supabase migrations must be applied in the target project before the live API can rely fully on credits, usage, and research tables.
- Environment variables must be set in Cloudflare Pages for production APIs and Stripe webhooks.
- Research Inbox falls back to starter data if the research migration/API is not ready.

## Suggested Next Steps

1. Decide whether to commit the current work as one release or split it into smaller commits.
2. Apply and verify Supabase migrations in the production project.
3. Confirm Cloudflare Pages env vars for Supabase, Stripe, Apify, Resend, AICre8, and cron secret.
4. Add stable routing if `/pricing` and `/research` URLs are needed.
5. Wire monthly plan checkout or hide purchase language for plans until subscriptions are ready.
6. Keep iterating on the top-of-dashboard Find form, since it is the main job-to-be-done.
