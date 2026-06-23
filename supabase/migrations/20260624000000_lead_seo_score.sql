-- Store each website-having lead's SEO score (0-100) from AICre8's seo-score
-- engine, so we can flag "bad website → Rebuild + SEO" prospects. Populated by
-- the batched scoring step in cron/process.ts (best-effort, null until audited).
alter table lead_engine_leads add column if not exists seo_score int;
