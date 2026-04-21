import { Campaign, Settings } from '../types';

const defaultEmailTemplate = `Hi {{business_name}},

I noticed your business could benefit from a modern web presence. I built a quick preview site for you — no strings attached.

Check it out here: {{preview_url}}

If you like what you see, I'd love to chat about how we can help you get more customers online.

Best,
Grow Leads Team`;

export const mockCampaigns: Campaign[] = [
  {
    id: 'camp-1',
    niche: 'Electricians',
    city: 'Tampa, FL',
    totalLeads: 10,
    progress: 30,
    status: 'running',
    startedAt: '2 hours ago',
    emailTemplate: defaultEmailTemplate,
    stats: {
      scraped: 10,
      sitesBuilt: 7,
      addedToCrm: 5,
      emailsSent: 3,
    },
    leads: [
      { id: 'l1', businessName: 'Tampa Bay Electric Co.', phone: '(813) 555-0101', email: 'info@tampaelectric.com', website: 'tampaelectric.com', status: 'email_sent', previewUrl: 'https://preview.aicre8.app/tampa-electric' },
      { id: 'l2', businessName: 'Sunshine State Electrical', phone: '(813) 555-0102', email: 'contact@sunshineelec.com', website: 'sunshineelec.com', status: 'email_sent', previewUrl: 'https://preview.aicre8.app/sunshine-elec' },
      { id: 'l3', businessName: 'Bay Area Wiring Pros', phone: '(813) 555-0103', email: 'hello@bawiring.com', website: 'bawiring.com', status: 'email_sent', previewUrl: 'https://preview.aicre8.app/ba-wiring' },
      { id: 'l4', businessName: 'Gulf Coast Electricians', phone: '(813) 555-0104', email: 'service@gulfcoastelec.com', website: 'gulfcoastelec.com', status: 'building', previewUrl: undefined },
      { id: 'l5', businessName: 'PowerLine Tampa', phone: '(813) 555-0105', email: 'info@powerlinetampa.com', website: 'powerlinetampa.com', status: 'building', previewUrl: undefined },
      { id: 'l6', businessName: 'Spark Masters LLC', phone: '(813) 555-0106', email: 'team@sparkmasters.com', website: 'sparkmasters.com', status: 'scraping' },
      { id: 'l7', businessName: 'Reliable Electric Services', phone: '(813) 555-0107', email: 'info@reliableelec.com', website: 'reliableelec.com', status: 'pending' },
      { id: 'l8', businessName: 'Circuit Pro Tampa', phone: '(813) 555-0108', email: 'hello@circuitpro.com', website: 'circuitpro.com', status: 'pending' },
      { id: 'l9', businessName: 'Volt Electric Group', phone: '(813) 555-0109', email: 'contact@voltgroup.com', website: 'voltgroup.com', status: 'pending' },
      { id: 'l10', businessName: 'Amp\'d Up Electrical', phone: '(813) 555-0110', email: 'info@ampdupelec.com', website: 'ampdupelec.com', status: 'pending' },
    ],
  },
  {
    id: 'camp-2',
    niche: 'Plumbers',
    city: 'Austin, TX',
    totalLeads: 10,
    progress: 100,
    status: 'complete',
    startedAt: '3 days ago',
    emailTemplate: defaultEmailTemplate,
    stats: {
      scraped: 10,
      sitesBuilt: 10,
      addedToCrm: 10,
      emailsSent: 10,
    },
    leads: Array.from({ length: 10 }, (_, i) => ({
      id: `l-austin-${i}`,
      businessName: `Austin Plumbing Co. ${i + 1}`,
      phone: `(512) 555-020${i}`,
      email: `info@austinplumb${i + 1}.com`,
      website: `austinplumb${i + 1}.com`,
      status: 'email_sent' as const,
      previewUrl: `https://preview.aicre8.app/austin-plumb-${i + 1}`,
    })),
  },
  {
    id: 'camp-3',
    niche: 'Dentists',
    city: 'Miami, FL',
    totalLeads: 10,
    progress: 0,
    status: 'pending',
    startedAt: 'Just now',
    emailTemplate: defaultEmailTemplate,
    stats: {
      scraped: 0,
      sitesBuilt: 0,
      addedToCrm: 0,
      emailsSent: 0,
    },
    leads: Array.from({ length: 10 }, (_, i) => ({
      id: `l-miami-${i}`,
      businessName: `Miami Dental ${i + 1}`,
      phone: `(305) 555-030${i}`,
      email: `info@miamidental${i + 1}.com`,
      website: `miamidental${i + 1}.com`,
      status: 'pending' as const,
    })),
  },
];

export const defaultSettings: Settings = {
  fromName: 'Grow Leads',
  replyTo: 'hello@growagency.com',
  aicre8ApiKey: '',
  apifyToken: '',
  emailTemplate: defaultEmailTemplate,
};
