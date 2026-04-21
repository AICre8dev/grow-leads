import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface NewCampaignInlineProps {
  onCreate: (data: { niche: string; city: string; totalLeads: number; emailTemplate: string }) => void;
}

const NICHES = [
  'Electricians',
  'Plumbers',
  'Dentists',
  'Roofers',
  'HVAC',
  'Landscapers',
  'Auto Repair',
  'Chiropractors',
  'Real Estate Agents',
  'Personal Trainers',
  'Photographers',
  'Cleaning Services',
  'Pest Control',
  'Locksmiths',
  'Painters',
];

const defaultTemplate = `Hi {{business_name}},

I noticed your business could benefit from a modern web presence. I built a quick preview site for you — no strings attached.

Check it out here: {{preview_url}}

If you like what you see, I'd love to chat about how we can help you get more customers online.

Best,
Grow Leads Team`;

export default function NewCampaignInline({ onCreate }: NewCampaignInlineProps) {
  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [totalLeads, setTotalLeads] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche || !city.trim()) return;
    onCreate({ niche, city: city.trim(), totalLeads, emailTemplate: defaultTemplate });
    setNiche('');
    setCity('');
    setTotalLeads(10);
  };

  return (
    <div className="bg-grow-card border border-grow-border rounded-xl p-6 md:p-8 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
      <h2 className="text-grow-text font-semibold text-lg mb-1">New Campaign</h2>
      <p className="text-grow-text-secondary text-sm mb-6">
        Find local businesses with no website and build them a site in seconds.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Niche */}
        <div>
          <label className="block text-grow-text-secondary text-sm mb-2">Niche</label>
          <div className="relative">
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full appearance-none bg-grow-surface border border-grow-border rounded-lg px-4 py-3 text-sm text-grow-text focus:outline-none focus:border-grow-accent/50 focus:ring-1 focus:ring-grow-accent/20 transition-colors cursor-pointer"
            >
              <option value="" disabled>Select a niche</option>
              {NICHES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-grow-text-secondary">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* City */}
        <div>
          <label className="block text-grow-text-secondary text-sm mb-2">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Phoenix, AZ"
            className="w-full bg-grow-surface border border-grow-border rounded-lg px-4 py-3 text-sm text-grow-text placeholder-grow-text-muted focus:outline-none focus:border-grow-accent/50 focus:ring-1 focus:ring-grow-accent/20 transition-colors"
          />
        </div>

        {/* Number of Leads — Slider */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-grow-text-secondary text-sm">Number of Leads</label>
            <span className="bg-grow-accent text-white text-xs font-semibold px-2.5 py-1 rounded-full min-w-[32px] text-center">
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
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((totalLeads - 5) / 45) * 100}%, #1e1e2a ${((totalLeads - 5) / 45) * 100}%, #1e1e2a 100%)`,
            }}
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-grow-text-muted text-xs">5</span>
            <span className="text-grow-text-muted text-xs">50</span>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-grow-accent hover:bg-grow-accent-hover text-white font-semibold text-sm py-3.5 rounded-lg transition-colors"
        >
          Find Leads & Build Sites
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
}
