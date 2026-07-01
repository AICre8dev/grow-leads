import { useState, type FormEvent } from 'react';
import { ArrowRight, Briefcase, MapPin, Target, Users, Wallet } from 'lucide-react';
import { CreditSummary } from '../types';

interface NewCampaignInlineProps {
  onCreate: (data: { clientName?: string; niche: string; city: string; totalLeads: number; emailTemplate: string }) => Promise<boolean>;
  isCreating: boolean;
  credits: CreditSummary | null;
}

const NICHES = [
  'Electricians',
  'Plumbers',
  'Dentists',
  'Roofers',
  'HVAC',
  'Landscapers',
  'Auto Repair',
  'Mechanics',
  'Chiropractors',
  'Real Estate Agents',
  'Personal Trainers',
  'Photographers',
  'Cleaning Services',
  'Pest Control',
  'Locksmiths',
  'Painters',
];

const OTHER_NICHE = '__other__';

const defaultTemplate = `Hi {{business_name}},

I noticed your business could benefit from a modern web presence. I built a quick preview site for you — no strings attached.

Check it out here: {{preview_url}}

If you like what you see, I'd love to chat about how we can help you get more customers online.

Best,
Grow Leads Agent Team`;

export default function NewCampaignInline({
  onCreate,
  isCreating,
  credits,
}: NewCampaignInlineProps) {
  const [niche, setNiche] = useState('');
  const [customNiche, setCustomNiche] = useState('');
  const isOther = niche === OTHER_NICHE;
  const effectiveNiche = isOther ? customNiche.trim() : niche;
  const [city, setCity] = useState('');
  const [clientName, setClientName] = useState('');
  const [totalLeads, setTotalLeads] = useState(10);
  const availableCredits = credits?.availableCredits || 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!effectiveNiche || !city.trim() || isCreating) return;
    const created = await onCreate({
      clientName: clientName.trim() || undefined,
      niche: effectiveNiche,
      city: city.trim(),
      totalLeads,
      emailTemplate: defaultTemplate,
    });
    if (!created) return;

    setNiche('');
    setCustomNiche('');
    setCity('');
    setClientName('');
    setTotalLeads(10);
  };

  return (
    <div className="bg-grow-card border border-grow-border rounded-lg p-5 md:p-6 opacity-0 animate-fade-in-up shadow-[0_20px_60px_rgba(0,0,0,0.18)]" style={{ animationFillMode: 'forwards' }}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-6">
        <div>
          <div className="text-grow-accent text-[11px] font-semibold uppercase tracking-[0.18em] mb-2">Agent launch</div>
          <h2 className="text-grow-text font-semibold text-2xl md:text-[28px] leading-tight">Find, build, and brief local leads</h2>
          <p className="text-grow-text-secondary text-sm mt-2 max-w-xl">
            Spin up a GEO prospecting agent that finds local businesses, creates preview sites, and queues outreach.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-grow-border bg-grow-bg px-3 py-2 text-xs text-grow-text-secondary">
            <Wallet size={13} className="text-grow-accent" />
            <span className="text-grow-text">{availableCredits}</span> available credits
          </div>
          <div className="flex items-center gap-2 rounded-md border border-grow-border bg-grow-bg px-3 py-2 text-xs text-grow-text-secondary">
            <span className="h-2 w-2 rounded-full bg-grow-accent shadow-[0_0_16px_rgba(22,179,100,0.8)]" />
            Live pipeline
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="flex items-center gap-2 text-grow-text-secondary text-sm mb-2">
            <Briefcase size={14} />
            Client / business
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g. Ahmed Dental Marketing"
            className="w-full bg-grow-bg border border-grow-border rounded-md px-4 py-3 text-sm text-grow-text placeholder-grow-text-muted focus:outline-none focus:border-grow-accent/60 focus:ring-1 focus:ring-grow-accent/20 transition-colors"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="flex items-center gap-2 text-grow-text-secondary text-sm mb-2">
            <Target size={14} />
            Niche
          </label>
          <div className="relative">
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full appearance-none bg-grow-bg border border-grow-border rounded-md px-4 py-3 text-sm text-grow-text focus:outline-none focus:border-grow-accent/60 focus:ring-1 focus:ring-grow-accent/20 transition-colors cursor-pointer"
            >
              <option value="" disabled>Select a niche</option>
              {NICHES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
              <option value={OTHER_NICHE}>Other (type your own)…</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-grow-text-secondary">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          {isOther && (
            <input
              type="text"
              value={customNiche}
              onChange={(e) => setCustomNiche(e.target.value)}
              placeholder="e.g. Mobile Mechanics, Tattoo Studios…"
              autoFocus
              className="w-full mt-2 bg-grow-bg border border-grow-border rounded-md px-4 py-3 text-sm text-grow-text placeholder-grow-text-muted focus:outline-none focus:border-grow-accent/60 focus:ring-1 focus:ring-grow-accent/20 transition-colors"
            />
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 text-grow-text-secondary text-sm mb-2">
            <MapPin size={14} />
            City
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Phoenix, AZ"
            className="w-full bg-grow-bg border border-grow-border rounded-md px-4 py-3 text-sm text-grow-text placeholder-grow-text-muted focus:outline-none focus:border-grow-accent/60 focus:ring-1 focus:ring-grow-accent/20 transition-colors"
          />
        </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-grow-text-secondary text-sm">
              <Users size={14} />
              Number of Leads
            </label>
            <span className="bg-grow-text text-grow-bg text-xs font-semibold px-2.5 py-1 rounded-md min-w-[36px] text-center">
              {totalLeads}
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            step={1}
            value={totalLeads}
            onChange={(e) => setTotalLeads(parseInt(e.target.value))}
            className="w-full"
            style={{
              background: `linear-gradient(to right, #ff7a1a 0%, #ff7a1a ${((totalLeads - 5) / 45) * 100}%, #2b271e ${((totalLeads - 5) / 45) * 100}%, #2b271e 100%)`,
            }}
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-grow-text-muted text-xs">5</span>
            <span className="text-xs text-grow-text-muted">Estimated: {totalLeads} credits</span>
            <span className="text-grow-text-muted text-xs">50</span>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isCreating}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-grow-accent to-sky-500 hover:opacity-90 text-white font-semibold text-sm py-3.5 rounded-xl transition-opacity disabled:cursor-not-allowed disabled:opacity-60 shadow-[0_8px_22px_rgba(22,179,100,0.32)]"
        >
          {isCreating ? 'Starting Campaign...' : 'Find Leads & Build Sites'}
          {!isCreating && <ArrowRight size={16} />}
        </button>
      </form>
    </div>
  );
}
