import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';

interface NewCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { niche: string; city: string; totalLeads: number; emailTemplate: string }) => void;
}

const defaultTemplate = `Hi {{business_name}},

I noticed your business could benefit from a modern web presence. I built a quick preview site for you — no strings attached.

Check it out here: {{preview_url}}

If you like what you see, I'd love to chat about how we can help you get more customers online.

Best,
Grow Leads Team`;

export default function NewCampaignModal({ isOpen, onClose, onCreate }: NewCampaignModalProps) {
  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [totalLeads, setTotalLeads] = useState(10);
  const [emailTemplate, setEmailTemplate] = useState(defaultTemplate);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!niche.trim() || !city.trim()) return;
    onCreate({ niche: niche.trim(), city: city.trim(), totalLeads, emailTemplate });
    setNiche('');
    setCity('');
    setTotalLeads(10);
    setEmailTemplate(defaultTemplate);
  };

  const inputClass =
    'w-full bg-grow-surface border border-grow-border rounded-lg px-4 py-3 text-sm text-grow-text placeholder-grow-text-muted focus:outline-none focus:border-grow-accent/50 focus:ring-1 focus:ring-grow-accent/20 transition-colors';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 bg-grow-card border border-grow-border rounded-xl shadow-2xl animate-modal-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-grow-border">
          <h2 className="font-serif text-xl text-grow-text">New Campaign</h2>
          <button
            onClick={onClose}
            className="text-grow-text-muted hover:text-grow-text transition-colors p-1 rounded-md hover:bg-white/[0.04]"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-grow-text-secondary uppercase tracking-wider mb-2">Niche</label>
            <input type="text" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. Electricians" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-grow-text-secondary uppercase tracking-wider mb-2">City</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Tampa, FL" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-grow-text-secondary uppercase tracking-wider mb-2">Number of leads</label>
            <input type="number" value={totalLeads} onChange={(e) => setTotalLeads(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))} min={1} max={50} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-grow-text-secondary uppercase tracking-wider mb-2">Email Template</label>
            <textarea value={emailTemplate} onChange={(e) => setEmailTemplate(e.target.value)} rows={6} className={`${inputClass} resize-none font-mono text-xs leading-relaxed`} />
          </div>
          <button type="submit" className="w-full bg-grow-accent hover:bg-grow-accent-hover text-white font-medium text-sm py-3 rounded-lg transition-colors">
            Start Campaign
          </button>
        </form>
      </div>
    </div>
  );
}
