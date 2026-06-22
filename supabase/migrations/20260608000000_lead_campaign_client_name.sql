-- Add optional client label so agencies can run separate campaigns for friends,
-- businesses, and customer accounts without creating a new workspace.

alter table lead_campaigns
  add column if not exists client_name text;

create index if not exists lead_campaigns_client_name_idx
  on lead_campaigns(client_name);
