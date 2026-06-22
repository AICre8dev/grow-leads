import { FormEvent, useMemo, useState } from 'react';
import { Bot, Check, Loader2, Send, ShieldCheck, Sparkles, Wand2, X } from 'lucide-react';
import { CreditSummary } from '../types';

interface AgentCommandCenterProps {
  onCreateCampaign: (data: { clientName?: string; niche: string; city: string; totalLeads: number; emailTemplate: string }) => Promise<boolean>;
  isCreating: boolean;
  credits: CreditSummary | null;
}

interface AgentDraft {
  clientName?: string;
  niche: string;
  city: string;
  totalLeads: number;
  emailTemplate: string;
  confidence: 'high' | 'medium' | 'low';
}

const DEFAULT_PROMPT = 'For Ahmed Dental Marketing, find 25 dentists in Dubai, build sites for weak websites, then prepare a friendly email.';
const DEFAULT_EMAIL =
  'Hi {{businessName}}, I noticed your local website could be stronger. I built a quick preview showing how you could get more calls from nearby customers: {{previewUrl}}';

export default function AgentCommandCenter({
  onCreateCampaign,
  isCreating,
  credits,
}: AgentCommandCenterProps) {
  const [command, setCommand] = useState(DEFAULT_PROMPT);
  const [draft, setDraft] = useState<AgentDraft | null>(null);
  const [message, setMessage] = useState('Tell the agent the niche, city, and how many leads to source.');

  const minimumCredits = useMemo(() => {
    const leadCount = draft?.totalLeads || 0;
    return leadCount * 4;
  }, [draft]);

  const availableCredits = credits?.availableCredits || 0;
  const canAfford = !draft || !credits || availableCredits >= minimumCredits;

  const handlePlan = (event: FormEvent) => {
    event.preventDefault();
    const nextDraft = parseCommand(command);
    setDraft(nextDraft);
    setMessage(nextDraft.confidence === 'low'
      ? 'I made a best guess. Check the fields before approving.'
      : 'Plan ready. Approve it to create the campaign.');
  };

  const handleApprove = async () => {
    if (!draft || isCreating || !canAfford) return;

    const created = await onCreateCampaign({
      clientName: draft.clientName,
      niche: draft.niche,
      city: draft.city,
      totalLeads: draft.totalLeads,
      emailTemplate: draft.emailTemplate,
    });

    if (created) {
      setMessage('Campaign launched. The backend agent will take it from here.');
      setDraft(null);
    }
  };

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-grow-border bg-grow-card">
      <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="border-b border-grow-border p-4 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-grow-text-secondary">
                <Bot size={15} className="text-grow-accent" />
                Agent command center
              </div>
              <h2 className="mt-1 text-lg font-semibold text-grow-text">Ask Grow Leads Agent to start the work</h2>
            </div>
            <span className="rounded-md border border-grow-accent/20 bg-grow-accent/10 px-2 py-1 text-[11px] text-grow-accent">
              approval required
            </span>
          </div>

          <form onSubmit={handlePlan}>
            <label htmlFor="agent-command" className="sr-only">Agent command</label>
            <textarea
              id="agent-command"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-md border border-grow-border bg-grow-bg px-3 py-3 text-sm text-grow-text outline-none transition-colors placeholder:text-grow-text-muted focus:border-grow-accent/60"
              placeholder="Find 20 roofers in Leeds and prepare outreach..."
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-grow-text-secondary">{message}</p>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-grow-text px-4 py-2 text-sm font-semibold text-grow-bg transition-colors hover:bg-[#fff8eb]"
              >
                <Wand2 size={15} />
                Plan
              </button>
            </div>
          </form>
        </div>

        <div className="p-4">
          {draft ? (
            <div>
              <div className="mb-4 flex items-center gap-2 text-xs text-grow-text-secondary">
                <Sparkles size={14} className="text-grow-accent" />
                Proposed campaign
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <DraftField label="Client" value={draft.clientName || 'Internal'} />
                <DraftField label="Niche" value={draft.niche} />
                <DraftField label="City" value={draft.city} />
                <DraftField label="Leads" value={String(draft.totalLeads)} />
              </div>

              <div className="mt-3 rounded-md border border-grow-border bg-grow-bg p-3">
                <div className="mb-1 text-[10px] uppercase tracking-[0.12em] text-grow-text-muted">Email angle</div>
                <p className="text-xs leading-5 text-grow-text-secondary">{draft.emailTemplate}</p>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-grow-text-secondary">
                  <ShieldCheck size={14} className={canAfford ? 'text-green-300' : 'text-red-300'} />
                  {credits
                    ? `${minimumCredits} credits estimated, ${availableCredits} available`
                    : `${minimumCredits} credits estimated`}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-grow-border bg-grow-bg px-3 py-2 text-xs font-medium text-grow-text-secondary transition-colors hover:border-grow-border-hover hover:text-grow-text"
                  >
                    <X size={14} />
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isCreating || !canAfford}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-grow-accent px-3 py-2 text-xs font-semibold text-black transition-colors hover:bg-grow-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Approve
                  </button>
                </div>
              </div>

              {!canAfford && (
                <p className="mt-3 text-xs text-red-200">
                  Add credits from Pricing before approving.
                </p>
              )}
            </div>
          ) : (
            <div className="flex min-h-[210px] flex-col items-center justify-center rounded-md border border-dashed border-grow-border bg-grow-bg px-6 text-center">
              <Send size={22} className="mb-3 text-grow-text-muted" />
              <h3 className="text-sm font-semibold text-grow-text">No active plan</h3>
              <p className="mt-2 max-w-sm text-xs leading-5 text-grow-text-secondary">
                The agent will turn a plain-English request into a campaign plan. You approve before it spends credits or contacts anyone.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DraftField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-grow-border bg-grow-bg px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.12em] text-grow-text-muted">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-grow-text">{value}</div>
    </div>
  );
}

function parseCommand(command: string): AgentDraft {
  const normalized = command.trim().replace(/\s+/g, ' ');
  const leadMatch = normalized.match(/\b(\d{1,3})\s+(?:leads?|businesses|companies|prospects|places)\b/i)
    || normalized.match(/\bfind\s+(\d{1,3})\b/i);
  const totalLeads = clampNumber(leadMatch ? Number(leadMatch[1]) : 25, 5, 100);
  const city = titleCase(extractCity(normalized) || 'London');
  const niche = titleCase(extractNiche(normalized) || 'Local services');
  const clientName = titleCase(extractClientName(normalized) || '');
  const confidence = city === 'London' || niche === 'Local Services' ? 'low' : 'medium';

  return {
    clientName: clientName || undefined,
    niche,
    city,
    totalLeads,
    confidence,
    emailTemplate: DEFAULT_EMAIL,
  };
}

function extractClientName(command: string): string | null {
  const patterns = [
    /\bfor\s+([a-z][a-z0-9\s&.'-]{2,50}?)(?:,|\s+find\b|\s+source\b|\s+get\b|\s+scrape\b)/i,
    /\bclient\s+([a-z][a-z0-9\s&.'-]{2,50}?)(?:,|\s+find\b|\s+source\b|\s+get\b|\s+scrape\b|$)/i,
  ];

  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match?.[1]) return cleanPhrase(match[1]);
  }

  return null;
}

function extractCity(command: string): string | null {
  const patterns = [
    /\bin\s+([a-z][a-z\s.'-]{2,40})(?:,|\.|\s+(?:and|then|with|for|to|build|prepare|send|who|that)\b|$)/i,
    /\bnear\s+([a-z][a-z\s.'-]{2,40})(?:,|\.|\s+(?:and|then|with|for|to|build|prepare|send|who|that)\b|$)/i,
  ];

  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match?.[1]) return cleanPhrase(match[1]);
  }

  return null;
}

function extractNiche(command: string): string | null {
  const patterns = [
    /\b(?:find|source|get|scrape)\s+(?:\d{1,3}\s+)?([a-z][a-z\s&.'-]{2,40}?)(?:\s+in\b|\s+near\b|,|$)/i,
    /\bfor\s+([a-z][a-z\s&.'-]{2,40}?)(?:\s+in\b|\s+near\b|,|$)/i,
  ];

  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match?.[1]) return cleanPhrase(match[1]).replace(/\b(leads|businesses|companies|prospects|places)\b/gi, '').trim();
  }

  return null;
}

function cleanPhrase(value: string): string {
  return value
    .replace(/\b(with|that|who|and|then|build|prepare|send|email|outreach).*$/i, '')
    .replace(/[^\w\s&.'-]/g, '')
    .trim();
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
