# AICre8 / cgrow Rank Boost Handoff

Last updated: 20 June 2026

## Decision

Google Rank Boost should not live in the Grow Leads Agent UI.

It belongs in the AICre8 / cgrow dashboard as a client SEO audit and rank-improvement service. Grow Leads can find customers and build preview sites, but Rank Boost is the post-sale growth service for active AICre8/cgrow clients.

## What Happened In Grow Leads

The Rank Boost UI card/code was removed from Grow Leads so the tool stays focused on:

- finding customer leads,
- researching investors,
- launching preview-site/outreach campaigns,
- keeping pricing separate from the work flow.

The removed Rank Boost card was not committed in this `grow-leads` git history, so it cannot be restored with `git show HEAD:...` from this repo. Do not re-add it here just to preserve it.

## Canonical AICre8 / cgrow Code

The real Rank Boost foundation already exists in the AICre8-side workspace:

```text
/Users/openclaw/Documents/New project 2/aicre8-owner-alert-fix
```

Relevant files:

```text
app/routes/grow.seo.tsx
app/routes/api.grow.seo-audit.ts
app/lib/.server/grow/seoAudit.ts
app/lib/.server/grow/seoContentReview.ts
app/utils/seo.ts
supabase/migrations/20260616000000_grow_seo_audits.sql
```

What each file does:

- `app/routes/grow.seo.tsx`: client-facing/operator UI for SEO Audit. This is the right starting point for a Rank Boost dashboard surface.
- `app/routes/api.grow.seo-audit.ts`: Remix API route that loads audit history and runs fresh audits for a selected client.
- `app/lib/.server/grow/seoAudit.ts`: deterministic technical/on-page/local SEO scoring engine. This is the core Rank Boost engine.
- `app/lib/.server/grow/seoContentReview.ts`: optional AI content-quality pass for content depth, E-E-A-T, and search-intent recommendations.
- `app/utils/seo.ts`: sitemap/robots helpers, useful for the implementation/fix side of Rank Boost.
- `supabase/migrations/20260616000000_grow_seo_audits.sql`: DB table for storing audit history and latest `grow_clients.seo_score`.

## Current Engine Shape

The deterministic audit checks:

- HTTPS
- mobile viewport
- canonical URL
- indexability
- robots.txt
- sitemap.xml
- title tag length
- meta description
- exactly one H1
- Open Graph title/image
- image alt text
- content depth
- heading structure
- JSON-LD structured data
- LocalBusiness schema
- phone/NAP presence

It returns:

- `overall_score`
- category scores for `technical`, `onpage`, `content`, `local`
- severity-sorted issues
- passed/total check counts

The AI content pass can add qualitative recommendations and a short summary when `ANTHROPIC_API_KEY` is present.

## Product Direction

Rank Boost should become an AICre8/cgrow service panel with:

1. SEO score and score history per client.
2. Prioritized fix list from the audit engine.
3. "Run audit" and "Re-run audit" actions.
4. Monthly client report integration.
5. Fix workflow for generated pages/sites:
   - title/meta updates,
   - sitemap/robots checks,
   - LocalBusiness schema,
   - missing alt text,
   - better local-service content,
   - Google Business Profile/NAP checklist.

## Suggested Next Implementation Steps

1. Open the AICre8/cgrow workspace, not Grow Leads.
2. Read `app/routes/grow.seo.tsx` and verify it is still wired into the dashboard nav.
3. Apply `supabase/migrations/20260616000000_grow_seo_audits.sql` if it has not been applied.
4. Confirm required env vars:
   - Supabase config,
   - `ANTHROPIC_API_KEY` for AI content review,
   - any rate-limit KV binding used by `api.grow.seo-audit.ts`.
5. Rename/present the feature as `Rank Boost` if that is the commercial offer, while keeping the underlying route/API names if easier.
6. Connect the audit output to cgrow's monthly client report.
7. Add a "Fix with AICre8" action only after confirming the generated-site editing path.

## Do Not Do

- Do not put Google Rank Boost back into the Grow Leads Agent dashboard.
- Do not put Rank Boost pricing on Grow Leads.
- Do not mix Rank Boost with the Find / Agent Launch flow.
- Do not recreate a new audit engine in Grow Leads when the AICre8/cgrow engine already exists.
