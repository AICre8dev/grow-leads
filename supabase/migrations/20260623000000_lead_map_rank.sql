-- Store each lead's Google map-pack rank (1-based position in the search
-- results) so we can target "striking distance" prospects — businesses that
-- are visible (page 1-2 of the map results) but not yet in the top 3.
alter table lead_engine_leads add column if not exists map_rank int;
