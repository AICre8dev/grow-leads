import {
  Campaign,
  CreditPack,
  CreditSummary,
  GrowCreditPurchase,
  GrowUsage,
  GrowUsageEvent,
  Lead,
  ResearchIntent,
  ResearchLead,
  ResearchSource,
  ResearchStatus,
} from '../types';

type ApiLeadStatus = Lead['status'];
type ApiCampaignStatus = Campaign['status'];

interface CampaignRow {
  id: string;
  client_name?: string | null;
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
  address?: string | null;
  rating?: number | string | null;
  reviews_count?: number | null;
  map_rank?: number | null;
  status: ApiLeadStatus;
  site_url?: string | null;
  error_message?: string | null;
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
  credits?: CreditSummary;
}

interface CreditResponse {
  credits: CreditSummary;
  packs: CreditPack[];
}

interface UsageResponse {
  usage: GrowUsage;
  packs: CreditPack[];
  events: GrowUsageEvent[];
  purchases: GrowCreditPurchase[];
}

interface CheckoutResponse {
  url?: string;
  sessionId: string;
}

interface ResearchLeadRow {
  id: string;
  name: string;
  company?: string | null;
  role?: string | null;
  intent: ResearchIntent;
  source: ResearchSource;
  source_label?: string | null;
  location?: string | null;
  fit_score?: number | null;
  status: ResearchStatus;
  priority?: ResearchLead['priority'] | null;
  signal?: string | null;
  next_action?: string | null;
  hook?: string | null;
  contact?: string | null;
  value?: string | null;
  updated_at?: string | null;
}

interface ResearchListResponse {
  researchLeads: ResearchLeadRow[];
}

interface ResearchMutationResponse {
  researchLead: ResearchLeadRow;
}

export interface CreateCampaignInput {
  clientName?: string;
  niche: string;
  city: string;
  totalLeads: number;
  emailTemplate: string;
}

export interface CreateResearchLeadInput {
  name: string;
  company?: string;
  role?: string;
  intent?: ResearchIntent;
  source?: ResearchSource;
  sourceLabel?: string;
  location?: string;
  fitScore?: number;
  status?: ResearchStatus;
  priority?: ResearchLead['priority'];
  signal?: string;
  nextAction?: string;
  hook?: string;
  contact?: string;
  value?: string;
}

export interface UpdateResearchLeadInput {
  fitScore?: number;
  status?: ResearchStatus;
  priority?: ResearchLead['priority'];
  signal?: string;
  nextAction?: string;
  hook?: string;
  contact?: string;
  value?: string;
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
      clientName: input.clientName,
      leadCount: input.totalLeads,
      emailTemplate: input.emailTemplate,
    }),
  });
  return mapCampaign(campaign);
}

export async function getCredits(): Promise<CreditResponse> {
  return fetchJson<CreditResponse>('/api/grow/credits');
}

export async function getUsage(): Promise<UsageResponse> {
  return fetchJson<UsageResponse>('/api/grow/usage');
}

export async function createCreditCheckout(packId: string): Promise<string> {
  const { url } = await fetchJson<CheckoutResponse>('/api/grow/credits/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ packId }),
  });
  if (!url) throw new Error('Stripe did not return a checkout URL');
  return url;
}

// Best-effort nudge: drains finished Apify scrapes into leads (scrape-only).
// Safe to ignore failures — results surface via the campaign refresh.
export async function processLeads(): Promise<void> {
  try {
    await fetch('/api/lead-engine/process-now', { method: 'POST' });
  } catch {
    /* background nudge */
  }
}

export async function getCampaign(id: string): Promise<Campaign> {
  const { campaign, leads } = await fetchJson<CampaignDetailResponse>(`/api/lead-engine/campaigns/${id}`);
  return mapCampaign({ ...campaign, leads });
}

export async function listResearchLeads(): Promise<ResearchLead[]> {
  const { researchLeads } = await fetchJson<ResearchListResponse>('/api/grow/research');
  return researchLeads.map(mapResearchLead);
}

export async function createResearchLead(input: CreateResearchLeadInput): Promise<ResearchLead> {
  const { researchLead } = await fetchJson<ResearchMutationResponse>('/api/grow/research', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return mapResearchLead(researchLead);
}

export async function updateResearchLead(id: string, input: UpdateResearchLeadInput): Promise<ResearchLead> {
  const { researchLead } = await fetchJson<ResearchMutationResponse>(`/api/grow/research/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return mapResearchLead(researchLead);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const text = await response.text();
  let data: Record<string, unknown> = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Lead engine API is unavailable. Start the functions server to load live campaigns.');
    }
  }

  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

function mapResearchLead(row: ResearchLeadRow): ResearchLead {
  return {
    id: row.id,
    name: row.name,
    company: row.company || 'Research target',
    role: row.role || 'Target contact',
    intent: row.intent,
    source: row.source,
    sourceLabel: row.source_label || 'Manual research',
    location: row.location || 'Global',
    fitScore: typeof row.fit_score === 'number' ? row.fit_score : 70,
    status: row.status,
    priority: row.priority || 'medium',
    signal: row.signal || '',
    nextAction: row.next_action || '',
    hook: row.hook || '',
    contact: row.contact || 'To be enriched',
    value: row.value || '',
    updatedAt: formatStartedAt(row.updated_at),
  };
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
    clientName: row.client_name || undefined,
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
    address: row.address || undefined,
    rating: numberOr(row.rating, 0) || undefined,
    reviewsCount: typeof row.reviews_count === 'number' ? row.reviews_count : undefined,
    mapRank: typeof row.map_rank === 'number' ? row.map_rank : undefined,
    status: row.status,
    previewUrl: row.site_url || undefined,
    errorMessage: row.error_message || undefined,
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
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
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
