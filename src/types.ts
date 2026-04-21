export interface Lead {
  id: string;
  businessName: string;
  phone: string;
  email: string;
  website: string;
  status: 'pending' | 'scraping' | 'building' | 'added_to_crm' | 'email_sent' | 'failed';
  previewUrl?: string;
}

export interface Campaign {
  id: string;
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
