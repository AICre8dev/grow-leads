export interface Lead {
  id: string;
  businessName: string;
  phone: string;
  email: string;
  website: string;
  address?: string;
  rating?: number;
  reviewsCount?: number;
  mapRank?: number;
  seoScore?: number;
  status: 'pending' | 'scraping' | 'building' | 'added_to_crm' | 'email_sent' | 'failed';
  previewUrl?: string;
  errorMessage?: string;
}

export interface Campaign {
  id: string;
  clientName?: string;
  niche: string;
  city: string;
  totalLeads: number;
  progress: number;
  status: 'pending' | 'running' | 'complete' | 'failed';
  startedAt: string;
  leads: Lead[];
  stats: {
    scraped: number;
    sitesBuilt: number;
    addedToCrm: number;
    emailsSent: number;
  };
  emailTemplate: string;
}

export type ResearchIntent =
  | 'investor'
  | 'startup_customer'
  | 'local_business'
  | 'launch_listing'
  | 'agency_partner';

export type ResearchSource =
  | 'linkedin'
  | 'crunchbase'
  | 'product_hunt'
  | 'launch_directory'
  | 'google_maps'
  | 'github'
  | 'website'
  | 'csv';

export type ResearchStatus =
  | 'found'
  | 'qualified'
  | 'hook_ready'
  | 'contacted'
  | 'clicked'
  | 'replied'
  | 'booked'
  | 'blocked';

export interface ResearchLead {
  id: string;
  name: string;
  company: string;
  role: string;
  intent: ResearchIntent;
  source: ResearchSource;
  sourceLabel: string;
  location: string;
  fitScore: number;
  status: ResearchStatus;
  priority: 'high' | 'medium' | 'low';
  signal: string;
  nextAction: string;
  hook: string;
  contact: string;
  value: string;
  updatedAt: string;
}

export interface ResearchSourceSummary {
  id: ResearchSource;
  label: string;
  mode: 'connected' | 'import' | 'research' | 'submission';
  count: number;
  active: boolean;
  note: string;
}

export interface CreditPack {
  id: string;
  label?: string;
  credits: number;
  amountCents?: number;
}

export interface CreditSummary {
  availableCredits: number;
  reservedCredits: number;
  lifetimeCreditsSpent: number;
}

export interface GrowUsage {
  plan: 'starter' | 'agency' | 'agency_pro';
  periodStart: string;
  periodEnd: string;
  credits: {
    used: number;
    remaining: number;
    total: number;
  };
  voiceMinutes: {
    used: number;
    remaining: number;
    total: number;
  };
  clients: {
    used: number;
    limit: number;
  };
  providerSpendCents: number;
  hardSpendLimitCents: number;
  warningState: 'ok' | 'near_limit' | 'limit_reached' | 'spend_blocked';
}

export interface GrowUsageEvent {
  id: string;
  client_id?: string | null;
  event_type?: string | null;
  credits_delta?: number | string | null;
  voice_minutes_delta?: number | string | null;
  provider_spend_cents?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface GrowCreditPurchase {
  id: string;
  pack: string;
  credits: number;
  amount_cents: number;
  status: string;
  created_at: string;
  completed_at?: string | null;
}

export interface Settings {
  fromName: string;
  replyTo: string;
  aicre8ApiKey: string;
  apifyToken: string;
  emailTemplate: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  exiting?: boolean;
}
