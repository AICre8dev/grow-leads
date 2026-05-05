import { Campaign, Lead } from '../types';

type ApiLeadStatus = Lead['status'];
type ApiCampaignStatus = Campaign['status'];

interface CampaignRow {
  id: string;
  niche: string;
  city: string;
  lead_count: number;
  email_template?: string | null;
  status: ApiCampaignStatus;
  stats?: Partial<Campaign['stats']> | null;
  started_at?: string | null;
  created_at?: string | null;
  leads?: LeadRow[];
}

interface LeadRow {
  id: string;
  business_name?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  status: ApiLeadStatus;
  site_url?: string | null;
}

interface CampaignDetailResponse {
  campaign: CampaignRow;
  leads: LeadRow[];
}

interface CampaignListResponse {
  campaigns: CampaignRow[];
}

interface CampaignCreateResponse {
  campaign: CampaignRow;
}

export interface CreateCampaignInput {
  niche: string;
  city: string;
  totalLeads: number;
  emailTemplate: string;
}

export async function listCampaigns(): Promise<Campaign[]> {
  const { campaigns } = await fetchJson<CampaignListResponse>('/api/lead-engine/campaigns');
  return campaigns.map(mapCampaign);
}

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  const { campaign } = await fetchJson<CampaignCreateResponse>('/api/lead-engine/campaigns', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      niche: input.niche,
      city: input.city,
      leadCount: input.totalLeads,
      emailTemplate: input.emailTemplate,
    }),
  });
  return mapCampaign(campaign);
}

export async function getCampaign(id: string): Promise<Campaign> {
  const { campaign, leads } = await fetchJson<CampaignDetailResponse>(`/api/lead-engine/campaigns/${id}`);
  return mapCampaign({ ...campaign, leads });
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

function mapCampaign(row: CampaignRow): Campaign {
  const leads = (row.leads || []).map(mapLead);
  const totalLeads = row.lead_count || leads.length;
  const dbStats = row.stats || {};
  const stats = {
    scraped: numberOr(dbStats.scraped, leads.length),
    sitesBuilt: numberOr(dbStats.sitesBuilt, leads.filter((lead) => Boolean(lead.previewUrl)).length),
    addedToCrm: numberOr(
      dbStats.addedToCrm,
      leads.filter((lead) => lead.status === 'added_to_crm' || lead.status === 'email_sent').length,
    ),
    emailsSent: numberOr(dbStats.emailsSent, leads.filter((lead) => lead.status === 'email_sent').length),
  };

  return {
    id: row.id,
    niche: row.niche,
    city: row.city,
    totalLeads,
    progress: calculateProgress(row.status, stats, totalLeads),
    status: row.status,
    startedAt: formatStartedAt(row.started_at || row.created_at),
    leads,
    stats,
    emailTemplate: row.email_template || '',
  };
}

function mapLead(row: LeadRow): Lead {
  return {
    id: row.id,
    businessName: row.business_name || 'Unknown business',
    phone: row.phone || '',
    email: row.email || '',
    website: row.website || '',
    status: row.status,
    previewUrl: row.site_url || undefined,
  };
}

function calculateProgress(status: ApiCampaignStatus, stats: Campaign['stats'], totalLeads: number): number {
  if (status === 'complete') return 100;
  if (status === 'failed') return 0;
  if (totalLeads <= 0) return 0;

  const completedStageUnits = stats.scraped + stats.sitesBuilt + stats.addedToCrm + stats.emailsSent;
  return Math.min(99, Math.round((completedStageUnits / (totalLeads * 4)) * 100));
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function formatStartedAt(value?: string | null): string {
  if (!value) return 'Just now';

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 60_000) return 'Just now';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
