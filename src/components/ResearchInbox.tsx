import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Database,
  Factory,
  FileInput,
  Gauge,
  Github,
  Globe2,
  Layers3,
  MapPinned,
  MousePointerClick,
  Network,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
  Target,
  Upload,
  Users,
} from 'lucide-react';
import { researchLeads as seedResearchLeads, researchPipeline, researchSources } from '../data/researchInbox';
import { createResearchLead, CreateResearchLeadInput, drainResearch, listResearchLeads, sourceInvestors, updateResearchLead } from '../lib/api';
import { ResearchIntent, ResearchLead, ResearchSource, ResearchSourceSummary, ResearchStatus } from '../types';

type ResearchMode = 'customers' | 'investors';

interface ModeConfig {
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  defaultBrief: string;
  sourceIds: ResearchSource[];
  intentIds: ResearchIntent[];
  metricLabels: [string, string, string];
  queueTitle: string;
  briefTitle: string;
  stageLabel: string;
  primaryAction: string;
  secondaryAction: string;
  heroClass: string;
  chipClass: string;
  activeButtonClass: string;
  inactiveButtonClass: string;
  activeFilterClass: string;
  iconClass: string;
  detailIconClass: string;
  primaryActionClass: string;
}

const modeConfigs: Record<ResearchMode, ModeConfig> = {
  customers: {
    label: 'Customer Mode',
    eyebrow: 'Customer acquisition',
    title: 'Customer Command Center',
    description: 'Find buyers, build preview offers, and move the best prospects into reply and booking follow-up.',
    defaultBrief: 'Find high-value local businesses and startup founders who need stronger websites, launch help, and preview-site outreach.',
    sourceIds: ['google_maps', 'product_hunt', 'launch_directory', 'linkedin', 'github', 'website', 'csv'],
    intentIds: ['local_business', 'startup_customer', 'launch_listing', 'agency_partner'],
    metricLabels: ['Prospects', 'Qualified', 'Actions'],
    queueTitle: 'Customer queue',
    briefTitle: 'Customer targets to win',
    stageLabel: 'Stage customer brief',
    primaryAction: 'Build preview offer',
    secondaryAction: 'Move to follow-up queue',
    heroClass: 'border-[#704117] bg-[#19140b] shadow-[0_24px_80px_rgba(255,122,26,0.09)]',
    chipClass: 'border-grow-accent/30 bg-grow-accent/10 text-grow-accent',
    activeButtonClass: 'border-grow-accent bg-grow-accent text-black shadow-[0_0_0_4px_rgba(255,122,26,0.12)]',
    inactiveButtonClass: 'border-[#3c3426] bg-[#100f0c] text-grow-text-secondary hover:border-grow-accent/50 hover:text-grow-text',
    activeFilterClass: 'border-grow-accent/35 bg-grow-accent/10 text-grow-accent',
    iconClass: 'text-grow-accent',
    detailIconClass: 'text-grow-accent',
    primaryActionClass: 'bg-grow-accent text-black hover:bg-grow-accent-hover',
  },
  investors: {
    label: 'Investor Mode',
    eyebrow: 'Investor relations',
    title: 'Investor Signal Room',
    description: 'Track thesis fit, sharpen the hook, and move the warmest investor targets toward a meeting ask.',
    defaultBrief: 'Find investors for AICre8 who back AI tooling, creator software, no-code builders, SMB automation, and founder-led SaaS.',
    sourceIds: ['crunchbase', 'linkedin', 'github', 'website', 'csv'],
    intentIds: ['investor'],
    metricLabels: ['Investor targets', 'Warm fits', 'Meeting actions'],
    queueTitle: 'Investor queue',
    briefTitle: 'Investor targets to warm',
    stageLabel: 'Stage investor brief',
    primaryAction: 'Build investor page',
    secondaryAction: 'Move to meeting queue',
    heroClass: 'border-cyan-400/30 bg-[#071414] shadow-[0_24px_80px_rgba(34,211,238,0.08)]',
    chipClass: 'border-cyan-300/35 bg-cyan-300/10 text-cyan-200',
    activeButtonClass: 'border-cyan-200 bg-cyan-200 text-[#071414] shadow-[0_0_0_4px_rgba(34,211,238,0.12)]',
    inactiveButtonClass: 'border-cyan-900/70 bg-[#081010] text-cyan-100/70 hover:border-cyan-300/60 hover:text-cyan-100',
    activeFilterClass: 'border-cyan-300/35 bg-cyan-300/10 text-cyan-200',
    iconClass: 'text-cyan-200',
    detailIconClass: 'text-cyan-200',
    primaryActionClass: 'bg-cyan-200 text-[#071414] hover:bg-cyan-100',
  },
};

const customerIntentFilters: Array<{ id: 'all' | ResearchIntent; label: string }> = [
  { id: 'all', label: 'All customers' },
  { id: 'local_business', label: 'Local' },
  { id: 'startup_customer', label: 'Startups' },
  { id: 'launch_listing', label: 'Launch' },
  { id: 'agency_partner', label: 'Partners' },
];

const investorIntentFilters: Array<{ id: 'all' | ResearchIntent; label: string }> = [
  { id: 'all', label: 'All investors' },
  { id: 'investor', label: 'Thesis fit' },
];

export default function ResearchInbox() {
  const [activeMode, setActiveMode] = useState<ResearchMode>('customers');
  const [activeIntent, setActiveIntent] = useState<'all' | ResearchIntent>('all');
  const [leads, setLeads] = useState<ResearchLead[]>(seedResearchLeads);
  const [selectedLeadId, setSelectedLeadId] = useState(seedResearchLeads[0]?.id || '');
  const [brief, setBrief] = useState(modeConfigs.customers.defaultBrief);
  const [stagedBrief, setStagedBrief] = useState(modeConfigs.customers.defaultBrief);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSourcing, setIsSourcing] = useState(false);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState('Loading live research records...');

  useEffect(() => {
    let isMounted = true;

    listResearchLeads()
      .then((liveLeads) => {
        if (!isMounted) return;
        if (liveLeads.length > 0) {
          const nextMode = modeForIntent(liveLeads[0].intent);
          setLeads(liveLeads);
          setSelectedLeadId(liveLeads[0].id);
          setActiveMode(nextMode);
          setBrief(modeConfigs[nextMode].defaultBrief);
          setStagedBrief(modeConfigs[nextMode].defaultBrief);
          setSyncMessage('Synced with Supabase research records.');
        } else {
          setSyncMessage('No live records yet. Showing the starter research queue.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setSyncMessage(`${(err as Error).message || 'Research API unavailable'} Showing the starter queue.`);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const mode = modeConfigs[activeMode];
  const activeIntentFilters = activeMode === 'investors' ? investorIntentFilters : customerIntentFilters;

  const modeLeads = useMemo(() => {
    return leads.filter((lead) => mode.intentIds.includes(lead.intent));
  }, [leads, mode.intentIds]);

  const visibleLeads = useMemo(() => {
    if (activeIntent === 'all') return modeLeads;
    return modeLeads.filter((lead) => lead.intent === activeIntent);
  }, [activeIntent, modeLeads]);

  const sourceCounts = useMemo(() => {
    const counts = new Map<ResearchSource, number>();
    for (const lead of modeLeads) {
      counts.set(lead.source, (counts.get(lead.source) || 0) + 1);
    }
    return counts;
  }, [modeLeads]);

  const visibleSources = researchSources.filter((source) => mode.sourceIds.includes(source.id));
  const selectedLead = visibleLeads.find((lead) => lead.id === selectedLeadId) || visibleLeads[0];
  const qualifiedCount = modeLeads.filter((lead) => lead.fitScore >= 80).length;
  const actionCount = modeLeads.filter((lead) => lead.status === 'qualified' || lead.status === 'hook_ready').length;
  const bookedCount = modeLeads.filter((lead) => lead.status === 'booked').length;

  const handleSetMode = (nextMode: ResearchMode) => {
    const nextConfig = modeConfigs[nextMode];
    setActiveMode(nextMode);
    setActiveIntent('all');
    setBrief(nextConfig.defaultBrief);
    setStagedBrief(nextConfig.defaultBrief);
    const nextLead = leads.find((lead) => nextConfig.intentIds.includes(lead.intent));
    if (nextLead) setSelectedLeadId(nextLead.id);
  };

  // Poll the drain endpoint until the X scrape finishes and investors land (or
  // the run completes with no strong matches). X scrapes take ~30s-2min.
  const pollForInvestors = async (baseline: number) => {
    for (let attempt = 0; attempt < 15; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 8000));

      let drained;
      try {
        drained = await drainResearch();
      } catch {
        /* transient — retry next tick */
      }

      try {
        const live = await listResearchLeads();
        const investorLeads = live.filter((lead) => lead.intent === 'investor');
        if (investorLeads.length > baseline) {
          setLeads(live);
          setSelectedLeadId(investorLeads[0].id);
          setSyncMessage(`Sourced ${investorLeads.length - baseline} investor${investorLeads.length - baseline === 1 ? '' : 's'} from X — ranked by thesis fit.`);
          setIsSourcing(false);
          return;
        }
      } catch {
        /* keep polling */
      }

      const runsDone = drained && drained.runs.length > 0 && drained.runs.every((r) => r.status === 'done' || r.status === 'failed');
      if (runsDone) {
        setSyncMessage('Sourcing finished — no strong investor matches this round. Try widening the brief.');
        setIsSourcing(false);
        return;
      }
    }
    setSyncMessage('Still sourcing on X — new investors will appear here as they are found.');
    setIsSourcing(false);
  };

  const handleStageBrief = async (event: FormEvent) => {
    event.preventDefault();
    const nextBrief = brief.trim() || mode.defaultBrief;
    setStagedBrief(nextBrief);

    // Investor mode runs the live X sourcing engine instead of staging a note.
    if (activeMode === 'investors') {
      setIsSourcing(true);
      setSyncMessage('Searching X for active investors matching your thesis…');
      const baseline = leads.filter((lead) => lead.intent === 'investor').length;
      try {
        await sourceInvestors(nextBrief);
        void pollForInvestors(baseline);
      } catch (err) {
        setSyncMessage(`Could not start sourcing: ${(err as Error).message || 'unknown error'}`);
        setIsSourcing(false);
      }
      return;
    }

    setIsSaving(true);
    const draft = createLeadFromBrief(nextBrief, activeMode);

    try {
      const created = await createResearchLead(draft);
      setLeads((prev) => [created, ...prev]);
      setSelectedLeadId(created.id);
      setSyncMessage('Research brief saved to Supabase.');
    } catch (err) {
      const localLead = toLocalResearchLead(draft);
      setLeads((prev) => [localLead, ...prev]);
      setSelectedLeadId(localLead.id);
      setSyncMessage(`${(err as Error).message || 'Could not save to Supabase'} Saved locally for this session.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (lead: ResearchLead, status: ResearchStatus) => {
    const patch = statusPatch(status, activeMode);
    const localNext = { ...lead, ...patch, updatedAt: 'Just now' };

    if (lead.id.startsWith('local-') || lead.id.startsWith('research-')) {
      setLeads((prev) => prev.map((item) => (item.id === lead.id ? localNext : item)));
      setSyncMessage('Updated locally. Save the migration/API to persist this record.');
      return;
    }

    setIsUpdatingId(lead.id);
    try {
      const updated = await updateResearchLead(lead.id, patch);
      setLeads((prev) => prev.map((item) => (item.id === lead.id ? updated : item)));
      setSyncMessage(`Moved "${updated.name}" to ${statusLabel(updated.status)}.`);
    } catch (err) {
      setLeads((prev) => prev.map((item) => (item.id === lead.id ? localNext : item)));
      setSyncMessage(`${(err as Error).message || 'Could not update Supabase'} Updated locally for now.`);
    } finally {
      setIsUpdatingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-6">
      <div className={`mb-8 rounded-lg border p-5 opacity-0 animate-fade-in-up md:p-6 ${mode.heroClass}`} style={{ animationFillMode: 'forwards' }}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className={`mb-4 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs ${mode.chipClass}`}>
              <Network size={13} />
              {mode.eyebrow}
            </div>
            <h1 className="text-4xl font-semibold text-grow-text md:text-5xl">{mode.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-grow-text-secondary md:text-base">
              {mode.description}
            </p>
            <div className="mt-5 grid max-w-xl gap-2 sm:grid-cols-2">
              {(Object.keys(modeConfigs) as ResearchMode[]).map((modeId) => {
                const nextMode = modeConfigs[modeId];
                const Icon = modeId === 'customers' ? Building2 : Gauge;
                return (
                  <button
                    key={modeId}
                    type="button"
                    onClick={() => handleSetMode(modeId)}
                    className={`flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-left text-sm font-semibold ${
                      activeMode === modeId ? nextMode.activeButtonClass : nextMode.inactiveButtonClass
                    }`}
                  >
                    <span>{nextMode.label}</span>
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 md:min-w-[440px]">
            <ResearchMetric label={mode.metricLabels[0]} value={String(modeLeads.length)} icon={Database} accentClass={mode.iconClass} />
            <ResearchMetric label={mode.metricLabels[1]} value={String(qualifiedCount)} icon={Gauge} accentClass={mode.iconClass} />
            <ResearchMetric label={mode.metricLabels[2]} value={String(actionCount + bookedCount)} icon={Target} accentClass={mode.iconClass} />
          </div>
        </div>
      </div>

      <section className="mb-6 grid gap-3 lg:grid-cols-6">
        {visibleSources.map((source) => (
          <SourceTile key={source.id} source={source} count={sourceCounts.get(source.id) || source.count} mode={activeMode} />
        ))}
      </section>

      <section className="mb-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <form onSubmit={handleStageBrief} className={`rounded-lg border bg-grow-card p-4 ${activeMode === 'investors' ? 'border-cyan-400/25' : 'border-grow-border'}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-grow-text-secondary">
                <Sparkles size={14} className={mode.iconClass} />
                Research brief
              </div>
              <h2 className="mt-1 text-lg font-semibold text-grow-text">{mode.briefTitle}</h2>
            </div>
            <button
              type="button"
              onClick={() => setBrief(mode.defaultBrief)}
              className="inline-flex items-center gap-2 rounded-md border border-grow-border bg-grow-bg px-3 py-2 text-xs font-medium text-grow-text-secondary hover:border-grow-border-hover hover:text-grow-text"
            >
              <RefreshCcw size={14} />
              Reset
            </button>
          </div>
          <label htmlFor="research-brief" className="sr-only">Research brief</label>
          <textarea
            id="research-brief"
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            rows={4}
            className="w-full resize-none rounded-md border border-grow-border bg-grow-bg px-3 py-3 text-sm leading-6 text-grow-text outline-none placeholder:text-grow-text-muted focus:border-grow-accent/60"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-5 text-grow-text-secondary">
              Active brief: <span className="text-grow-text">{stagedBrief}</span>
            </p>
            <button
              type="submit"
              disabled={isSaving || isSourcing}
              className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-70 ${mode.primaryActionClass}`}
            >
              <ClipboardList size={15} />
              {activeMode === 'investors'
                ? isSourcing
                  ? 'Sourcing on X…'
                  : 'Find investors on X'
                : isSaving
                  ? 'Saving...'
                  : mode.stageLabel}
            </button>
          </div>
        </form>

        <div className="rounded-lg border border-grow-border bg-grow-card p-4">
          <div className="mb-4 flex items-center gap-2 text-xs text-grow-text-secondary">
            <Layers3 size={14} className={mode.iconClass} />
            Pipeline
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {researchPipeline.map((stage) => (
              <PipelineStage key={stage.status} stage={stage} count={modeLeads.filter((lead) => lead.status === stage.status).length} accentClass={mode.iconClass} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)]">
        <div className="overflow-hidden rounded-lg border border-grow-border bg-grow-card">
          <div className="border-b border-grow-border p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-grow-text">{mode.queueTitle}</h2>
                <p className="mt-1 text-sm text-grow-text-secondary">
                  {isLoading ? 'Loading...' : `${visibleLeads.length} targets in this view`} · {syncMessage}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeIntentFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveIntent(filter.id)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                      activeIntent === filter.id
                        ? mode.activeFilterClass
                        : 'border-grow-border bg-grow-bg text-grow-text-secondary hover:border-grow-border-hover hover:text-grow-text'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            {visibleLeads.length > 0 ? (
              visibleLeads.map((lead, index) => (
                <LeadQueueRow
                  key={lead.id}
                  lead={lead}
                  isSelected={lead.id === selectedLead?.id}
                  onSelect={() => setSelectedLeadId(lead.id)}
                  index={index}
                  mode={activeMode}
                />
              ))
            ) : (
              <div className="px-4 py-12 text-center">
                <p className="text-sm font-semibold text-grow-text">No {activeMode === 'investors' ? 'investor' : 'customer'} targets in this view yet.</p>
                <p className="mt-2 text-sm text-grow-text-secondary">Stage a brief above to add the first target.</p>
              </div>
            )}
          </div>
        </div>

        {selectedLead && (
          <LeadDetail
            lead={selectedLead}
            mode={activeMode}
            config={mode}
            isUpdating={isUpdatingId === selectedLead.id}
            onUpdateStatus={handleUpdateStatus}
          />
        )}
      </section>
    </div>
  );
}

function ResearchMetric({
  label,
  value,
  icon: Icon,
  accentClass,
}: {
  label: string;
  value: string;
  icon: typeof Database;
  accentClass: string;
}) {
  return (
    <div className="rounded-lg border border-grow-border bg-grow-card px-3 py-3">
      <div className="flex items-center justify-between text-grow-text-muted">
        <span className="text-[11px]">{label}</span>
        <Icon size={14} className={accentClass} />
      </div>
      <div className="mt-3 text-2xl font-semibold text-grow-text">{value}</div>
    </div>
  );
}

function SourceTile({ source, count, mode }: { source: ResearchSourceSummary; count: number; mode: ResearchMode }) {
  const Icon = sourceIcon(source.id);
  const modeClass = source.active
    ? mode === 'investors'
      ? 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100'
      : 'border-green-400/25 bg-green-500/10 text-green-200'
    : 'border-grow-border bg-grow-bg text-grow-text-secondary';
  const iconClass = mode === 'investors' ? 'text-cyan-200' : 'text-grow-accent';

  return (
    <div className={`rounded-lg border bg-grow-card p-3 ${mode === 'investors' ? 'border-cyan-900/70' : 'border-grow-border'}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className={`grid h-9 w-9 place-items-center rounded-md border border-grow-border bg-grow-bg ${iconClass}`}>
          <Icon size={17} />
        </div>
        <span className={`rounded-md border px-2 py-0.5 text-[11px] ${modeClass}`}>
          {source.active ? 'active' : source.mode}
        </span>
      </div>
      <div className="text-sm font-semibold text-grow-text">{source.label}</div>
      <div className="mt-1 text-xs text-grow-text-secondary">{source.note}</div>
      <div className="mt-4 flex items-end justify-between">
        <span className="text-2xl font-semibold text-grow-text">{count}</span>
        <span className="text-[11px] text-grow-text-muted">{modeLabel(source.mode)}</span>
      </div>
    </div>
  );
}

function PipelineStage({
  stage,
  count,
  accentClass,
}: {
  stage: { status: ResearchStatus; label: string };
  count: number;
  accentClass: string;
}) {
  const Icon = statusIcon(stage.status);

  return (
    <div className="rounded-md border border-grow-border bg-grow-bg p-3">
      <div className="flex items-center justify-between gap-2 text-grow-text-muted">
        <span className="text-xs">{stage.label}</span>
        <Icon size={14} className={accentClass} />
      </div>
      <div className="mt-3 text-xl font-semibold text-grow-text">{count}</div>
    </div>
  );
}

function LeadQueueRow({
  lead,
  isSelected,
  onSelect,
  index,
  mode,
}: {
  lead: ResearchLead;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
  mode: ResearchMode;
}) {
  const Icon = intentIcon(lead.intent);
  const selectedClass = mode === 'investors'
    ? 'bg-cyan-300/[0.06] ring-1 ring-inset ring-cyan-300/20'
    : 'bg-grow-surface ring-1 ring-inset ring-grow-accent/15';
  const iconClass = mode === 'investors' ? 'text-cyan-200' : 'text-grow-accent';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`grid w-full grid-cols-12 gap-3 border-b border-grow-border/70 px-4 py-4 text-left last:border-b-0 hover:bg-grow-surface opacity-0 animate-fade-in-up ${
        isSelected ? selectedClass : ''
      }`}
      style={{ animationDelay: `${index * 45}ms`, animationFillMode: 'forwards' }}
    >
      <div className="col-span-12 flex min-w-0 gap-3 md:col-span-5">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-md border border-grow-border bg-grow-bg ${iconClass}`}>
          <Icon size={17} />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-grow-text">{lead.name}</h3>
          <p className="mt-0.5 truncate text-xs text-grow-text-secondary">{lead.company} · {lead.role}</p>
        </div>
      </div>

      <div className="col-span-6 flex items-center md:col-span-2">
        <span className={scoreClass(lead.fitScore)}>{lead.fitScore}</span>
        <span className="ml-2 text-xs text-grow-text-muted">fit</span>
      </div>

      <div className="col-span-6 flex items-center md:col-span-2">
        <span className={`rounded-md border px-2 py-1 text-xs font-medium ${statusClass(lead.status)}`}>
          {statusLabel(lead.status)}
        </span>
      </div>

      <div className="col-span-12 flex items-center justify-between gap-3 md:col-span-3">
        <span className="truncate text-xs text-grow-text-secondary">{lead.nextAction}</span>
        <ArrowUpRight size={15} className="shrink-0 text-grow-text-muted" />
      </div>
    </button>
  );
}

function LeadDetail({
  lead,
  mode,
  config,
  isUpdating,
  onUpdateStatus,
}: {
  lead: ResearchLead;
  mode: ResearchMode;
  config: ModeConfig;
  isUpdating: boolean;
  onUpdateStatus: (lead: ResearchLead, status: ResearchStatus) => void;
}) {
  const Icon = intentIcon(lead.intent);
  const detailBorder = mode === 'investors' ? 'border-cyan-400/25' : 'border-grow-border';

  return (
    <aside className={`rounded-lg border bg-grow-card p-4 ${detailBorder}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`grid h-10 w-10 place-items-center rounded-md border border-grow-border bg-grow-bg ${config.detailIconClass}`}>
            <Icon size={18} />
          </div>
          <div>
            <div className="text-xs text-grow-text-secondary">{intentLabel(lead.intent)}</div>
            <h2 className="mt-1 text-lg font-semibold text-grow-text">{lead.name}</h2>
          </div>
        </div>
        <span className={priorityClass(lead.priority)}>{lead.priority}</span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <DetailStat label="Source" value={lead.sourceLabel} />
        <DetailStat label="Location" value={lead.location} />
        <DetailStat label="Fit score" value={`${lead.fitScore}/100`} />
        <DetailStat label="Value" value={lead.value} />
      </div>

      <DetailBlock title="Signal" body={lead.signal} icon={Search} accentClass={config.detailIconClass} />
      <DetailBlock title="Hook" body={lead.hook} icon={MousePointerClick} accentClass={config.detailIconClass} />
      <DetailBlock title="Next action" body={lead.nextAction} icon={Send} accentClass={config.detailIconClass} />

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onUpdateStatus(lead, 'hook_ready')}
          className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold ${config.primaryActionClass}`}
        >
          <Sparkles size={15} />
          {isUpdating ? 'Updating...' : config.primaryAction}
        </button>
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onUpdateStatus(lead, 'booked')}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-grow-border bg-grow-bg px-4 py-2 text-sm font-medium text-grow-text-secondary hover:border-grow-border-hover hover:text-grow-text"
        >
          <CalendarCheck size={15} />
          {config.secondaryAction}
        </button>
      </div>
    </aside>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-grow-border bg-grow-bg px-3 py-2">
      <div className="text-[10px] text-grow-text-muted">{label}</div>
      <div className="mt-1 truncate text-xs font-semibold text-grow-text">{value}</div>
    </div>
  );
}

function DetailBlock({
  title,
  body,
  icon: Icon,
  accentClass,
}: {
  title: string;
  body: string;
  icon: typeof Search;
  accentClass: string;
}) {
  return (
    <div className="border-t border-grow-border py-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-grow-text">
        <Icon size={14} className={accentClass} />
        {title}
      </div>
      <p className="text-sm leading-6 text-grow-text-secondary">{body}</p>
    </div>
  );
}

function sourceIcon(source: ResearchSource) {
  const icons: Record<ResearchSource, typeof Database> = {
    linkedin: Users,
    crunchbase: Database,
    product_hunt: CircleDot,
    launch_directory: FileInput,
    google_maps: MapPinned,
    github: Github,
    website: Globe2,
    csv: Upload,
  };
  return icons[source];
}

function intentIcon(intent: ResearchIntent) {
  const icons: Record<ResearchIntent, typeof Factory> = {
    investor: Gauge,
    startup_customer: Factory,
    local_business: Building2,
    launch_listing: FileInput,
    agency_partner: Users,
  };
  return icons[intent];
}

function statusIcon(status: ResearchStatus) {
  const icons: Record<ResearchStatus, typeof CircleDot> = {
    found: Search,
    qualified: CheckCircle2,
    hook_ready: Sparkles,
    contacted: Send,
    clicked: MousePointerClick,
    replied: ClipboardList,
    booked: CalendarCheck,
    blocked: CircleDot,
  };
  return icons[status];
}

function modeLabel(mode: ResearchSourceSummary['mode']): string {
  const labels: Record<ResearchSourceSummary['mode'], string> = {
    connected: 'live',
    import: 'import',
    research: 'research',
    submission: 'submit',
  };
  return labels[mode];
}

function intentLabel(intent: ResearchIntent): string {
  const labels: Record<ResearchIntent, string> = {
    investor: 'Investor research',
    startup_customer: 'Startup customer',
    local_business: 'Local business',
    launch_listing: 'Launch listing',
    agency_partner: 'Agency partner',
  };
  return labels[intent];
}

function statusLabel(status: ResearchStatus): string {
  const labels: Record<ResearchStatus, string> = {
    found: 'found',
    qualified: 'qualified',
    hook_ready: 'hook ready',
    contacted: 'contacted',
    clicked: 'clicked',
    replied: 'replied',
    booked: 'booked',
    blocked: 'blocked',
  };
  return labels[status];
}

function scoreClass(score: number): string {
  if (score >= 90) return 'text-sm font-semibold text-green-300';
  if (score >= 80) return 'text-sm font-semibold text-grow-accent';
  return 'text-sm font-semibold text-grow-text-secondary';
}

function statusClass(status: ResearchStatus): string {
  const classes: Record<ResearchStatus, string> = {
    found: 'border-sky-400/20 bg-sky-500/10 text-sky-200',
    qualified: 'border-green-400/20 bg-green-500/10 text-green-200',
    hook_ready: 'border-grow-accent/25 bg-grow-accent/10 text-grow-accent',
    contacted: 'border-violet-400/20 bg-violet-500/10 text-violet-200',
    clicked: 'border-teal-400/20 bg-teal-500/10 text-teal-200',
    replied: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
    booked: 'border-green-400/30 bg-green-500/15 text-green-100',
    blocked: 'border-red-400/25 bg-red-500/10 text-red-200',
  };
  return classes[status];
}

function priorityClass(priority: ResearchLead['priority']): string {
  const classes: Record<ResearchLead['priority'], string> = {
    high: 'rounded-md border border-green-400/25 bg-green-500/10 px-2 py-1 text-[11px] font-medium text-green-200',
    medium: 'rounded-md border border-grow-accent/25 bg-grow-accent/10 px-2 py-1 text-[11px] font-medium text-grow-accent',
    low: 'rounded-md border border-grow-border bg-grow-bg px-2 py-1 text-[11px] font-medium text-grow-text-secondary',
  };
  return classes[priority];
}

function createLeadFromBrief(brief: string, mode: ResearchMode): CreateResearchLeadInput {
  const intent = inferIntent(brief, mode);
  const location = extractLocation(brief);

  return {
    name: briefName(intent),
    company: 'Research command',
    role: briefRole(intent),
    intent,
    source: briefSource(intent),
    sourceLabel: 'Manual brief',
    location,
    fitScore: intent === 'investor' || intent === 'launch_listing' ? 86 : 78,
    status: 'found',
    priority: intent === 'investor' || intent === 'local_business' || intent === 'launch_listing' ? 'high' : 'medium',
    signal: brief,
    nextAction: nextActionForIntent(intent),
    hook: hookForIntent(intent),
    contact: 'To be enriched',
    value: valueForIntent(intent),
  };
}

function toLocalResearchLead(input: CreateResearchLeadInput): ResearchLead {
  return {
    id: `local-${Date.now()}`,
    name: input.name,
    company: input.company || 'Research command',
    role: input.role || 'Target contact',
    intent: input.intent || 'startup_customer',
    source: input.source || 'website',
    sourceLabel: input.sourceLabel || 'Manual brief',
    location: input.location || 'Global',
    fitScore: input.fitScore || 70,
    status: input.status || 'found',
    priority: input.priority || 'medium',
    signal: input.signal || '',
    nextAction: input.nextAction || '',
    hook: input.hook || '',
    contact: input.contact || 'To be enriched',
    value: input.value || '',
    updatedAt: 'Just now',
  };
}

function statusPatch(status: ResearchStatus, mode: ResearchMode) {
  if (status === 'hook_ready') {
    return {
      status,
      nextAction: mode === 'investors'
        ? 'Generate the investor page, then prepare the meeting ask.'
        : 'Generate the preview offer, then prepare customer outreach.',
    };
  }

  if (status === 'booked') {
    return {
      status,
      nextAction: mode === 'investors'
        ? 'Prepare investor call notes and move this target into meeting follow-up.'
        : 'Prepare call notes and move this target into customer follow-up.',
    };
  }

  return { status };
}

function inferIntent(brief: string, mode: ResearchMode): ResearchIntent {
  const lower = brief.toLowerCase();
  if (/\binvestor|fund|vc|angel|raise|fundraising/.test(lower)) return 'investor';
  if (/\bdirectory|directories|launch|product hunt|betalist|listed|listing/.test(lower)) return 'launch_listing';
  if (/\bdentist|clinic|restaurant|salon|roofer|plumber|local|maps/.test(lower)) return 'local_business';
  if (/\bagency|partner|reseller|white label/.test(lower)) return 'agency_partner';
  if (mode === 'investors') return 'investor';
  return 'startup_customer';
}

function modeForIntent(intent: ResearchIntent): ResearchMode {
  return intent === 'investor' ? 'investors' : 'customers';
}

function briefSource(intent: ResearchIntent): ResearchSource {
  if (intent === 'investor') return 'crunchbase';
  if (intent === 'launch_listing') return 'launch_directory';
  if (intent === 'local_business') return 'google_maps';
  if (intent === 'agency_partner') return 'linkedin';
  return 'product_hunt';
}

function briefName(intent: ResearchIntent): string {
  const names: Record<ResearchIntent, string> = {
    investor: 'New investor research brief',
    launch_listing: 'New launch directory brief',
    local_business: 'New local business campaign',
    agency_partner: 'New agency partner shortlist',
    startup_customer: 'New startup customer research',
  };
  return names[intent];
}

function briefRole(intent: ResearchIntent): string {
  const roles: Record<ResearchIntent, string> = {
    investor: 'Investor targets',
    launch_listing: 'Directory submission targets',
    local_business: 'Business owners and managers',
    agency_partner: 'Agency owners',
    startup_customer: 'Founders and growth leads',
  };
  return roles[intent];
}

function nextActionForIntent(intent: ResearchIntent): string {
  const actions: Record<ResearchIntent, string> = {
    investor: 'Build AICre8 investor pitch page',
    launch_listing: 'Generate launch kit and submission copy',
    local_business: 'Qualify websites, then build preview sites',
    agency_partner: 'Prepare partner outreach sequence',
    startup_customer: 'Offer Launch Agent or AICre8 site build',
  };
  return actions[intent];
}

function hookForIntent(intent: ResearchIntent): string {
  const hooks: Record<ResearchIntent, string> = {
    investor: 'Personalised investor page with thesis fit, product demo, traction, and meeting ask.',
    launch_listing: 'Reusable startup launch kit adapted for each directory and approval flow.',
    local_business: 'Preview site showing how the business could get more calls, trust, and bookings.',
    agency_partner: 'Partner page showing how the agency can resell AICre8 and Grow Leads campaigns.',
    startup_customer: 'Founder-specific page showing launch distribution, website upgrade, and traffic value.',
  };
  return hooks[intent];
}

function valueForIntent(intent: ResearchIntent): string {
  const values: Record<ResearchIntent, string> = {
    investor: 'Fundraising pipeline',
    launch_listing: 'Traffic and backlinks',
    local_business: 'Client lead campaign',
    agency_partner: 'Channel partners',
    startup_customer: 'AICre8 customer pipeline',
  };
  return values[intent];
}

function extractLocation(brief: string): string {
  const match = brief.match(/\b(?:in|near|around)\s+([a-z][a-z\s.'-]{2,40})(?:,|\.|\s+(?:for|and|then|with|who|that|to)\b|$)/i);
  return match?.[1]?.trim() || 'Global';
}
