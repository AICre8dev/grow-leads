import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Gauge,
  Radar,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { Campaign, CreditSummary, GrowCreditPurchase, GrowUsage, GrowUsageEvent } from '../types';
import AgentCommandCenter from './AgentCommandCenter';
import NewCampaignInline from './NewCampaignInline';

interface DashboardProps {
  campaigns: Campaign[];
  onNewCampaign: (data: { clientName?: string; niche: string; city: string; totalLeads: number; emailTemplate: string }) => Promise<boolean>;
  onSelectCampaign: (id: string) => void;
  isLoading: boolean;
  isCreating: boolean;
  credits: CreditSummary | null;
  usage: GrowUsage | null;
  usageEvents: GrowUsageEvent[];
  creditPurchases: GrowCreditPurchase[];
  isUsageOpen: boolean;
  onOpenUsage: () => void;
  onCloseUsage: () => void;
}

export default function Dashboard({
  campaigns,
  onNewCampaign,
  onSelectCampaign,
  isLoading,
  isCreating,
  credits,
  usage,
  usageEvents,
  creditPurchases,
  isUsageOpen,
  onOpenUsage,
  onCloseUsage,
}: DashboardProps) {
  const runningCount = campaigns.filter((campaign) => campaign.status === 'running').length;
  const completeCount = campaigns.filter((campaign) => campaign.status === 'complete').length;
  const totalLeads = campaigns.reduce((sum, campaign) => sum + campaign.totalLeads, 0);
  const emailsSent = campaigns.reduce((sum, campaign) => sum + campaign.stats.emailsSent, 0);

  const metrics = [
    { label: 'Active agents', value: runningCount, icon: Zap },
    { label: 'Leads sourced', value: totalLeads, icon: Radar },
    { label: 'Outreach sent', value: emailsSent, icon: CheckCircle2 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 pt-24 pb-16">
      <NewCampaignInline
        onCreate={onNewCampaign}
        isCreating={isCreating}
        credits={credits}
      />

      <div className="my-8 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-grow-border bg-grow-card px-3 py-1.5 text-xs text-grow-text-secondary mb-4">
              <Sparkles size={13} className="text-grow-accent" />
              Customer and investor acquisition
            </div>
            <h1 className="text-grow-text text-4xl md:text-5xl font-semibold tracking-tight">Grow Leads Agent</h1>
            <p className="text-grow-text-secondary text-sm md:text-base mt-3 max-w-2xl">
              Launch campaigns, build preview offers, research investors, and monitor every acquisition workflow from one clean workspace.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 md:min-w-[440px]">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="rounded-lg border border-grow-border bg-grow-card px-3 py-3">
                  <div className="flex items-center justify-between text-grow-text-muted">
                    <span className="text-[11px]">{metric.label}</span>
                    <Icon size={14} />
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-grow-text">{metric.value}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <UsageWidget
        usage={usage}
        onOpenUsage={onOpenUsage}
      />

      <AgentCommandCenter
        onCreateCampaign={onNewCampaign}
        isCreating={isCreating}
        credits={credits}
      />

      <div className="mt-8 rounded-lg border border-grow-border bg-grow-card overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-grow-border px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-grow-text font-semibold text-lg">Campaigns</h2>
            <p className="text-grow-text-secondary text-sm mt-1">
              {completeCount} complete, {runningCount} currently running
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-grow-text-secondary">
            <Clock3 size={14} />
            Syncs every 15 seconds
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
            <p className="text-grow-text-secondary text-sm">Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
            <p className="text-grow-text-secondary text-sm">No campaigns yet. Create your first one above.</p>
          </div>
        ) : (
          <div>
            {campaigns.map((campaign, index) => (
              <CampaignListItem
                key={campaign.id}
                campaign={campaign}
                onClick={() => onSelectCampaign(campaign.id)}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {isUsageOpen && usage && (
        <UsageDetailModal
          usage={usage}
          events={usageEvents}
          purchases={creditPurchases}
          onClose={onCloseUsage}
        />
      )}
    </div>
  );
}

function UsageWidget({
  usage,
  onOpenUsage,
}: {
  usage: GrowUsage | null;
  onOpenUsage: () => void;
}) {
  const stateClasses: Record<string, string> = {
    ok: 'border-grow-border bg-grow-card',
    near_limit: 'border-amber-400/30 bg-amber-500/10',
    limit_reached: 'border-red-400/30 bg-red-500/10',
    spend_blocked: 'border-red-400/50 bg-red-500/15',
  };
  const planLabel = usage ? planName(usage.plan) : 'Starter';

  return (
    <div className={`mb-6 rounded-lg border p-4 ${stateClasses[usage?.warningState || 'ok']}`}>
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-grow-text-secondary text-xs">
            <Gauge size={14} className="text-grow-accent" />
            Usage this month
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-grow-text text-lg font-semibold">{planLabel}</h2>
            <span className={usageStateClass(usage?.warningState || 'ok')}>
              {usageStateLabel(usage?.warningState || 'ok')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <UsageStat label="Grow credits" value={usage ? formatRemaining(usage.credits.remaining, usage.credits.total) : '--'} />
          <UsageStat label="Voice minutes" value={usage ? formatRemaining(usage.voiceMinutes.remaining, usage.voiceMinutes.total) : '--'} />
          <UsageStat label="Clients" value={usage ? `${usage.clients.used}/${usage.clients.limit}` : '--'} />
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            type="button"
            onClick={onOpenUsage}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-grow-border bg-grow-bg px-3 py-2 text-xs font-medium text-grow-text-secondary transition-colors hover:border-grow-border-hover hover:text-grow-text"
          >
            <Radar size={14} />
            Details
          </button>
        </div>
      </div>
    </div>
  );
}

function UsageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-grow-border bg-grow-bg px-3 py-2">
      <div className="text-[10px] text-grow-text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-grow-text">{value}</div>
    </div>
  );
}

function UsageDetailModal({
  usage,
  events,
  purchases,
  onClose,
}: {
  usage: GrowUsage;
  events: GrowUsageEvent[];
  purchases: GrowCreditPurchase[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg border border-grow-border bg-grow-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-grow-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-grow-text">Usage this month</h2>
            <p className="mt-1 text-xs text-grow-text-secondary">
              {formatDate(usage.periodStart)} - {formatDate(usage.periodEnd)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-grow-text-secondary transition-colors hover:bg-white/[0.04] hover:text-grow-text"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-76px)] overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <UsageStat label="Grow credits" value={formatRemaining(usage.credits.remaining, usage.credits.total)} />
            <UsageStat label="Voice minutes" value={formatRemaining(usage.voiceMinutes.remaining, usage.voiceMinutes.total)} />
            <UsageStat label="Clients" value={`${usage.clients.used}/${usage.clients.limit}`} />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section>
              <h3 className="mb-3 text-sm font-semibold text-grow-text">Recent usage events</h3>
              <div className="overflow-hidden rounded-lg border border-grow-border">
                {events.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-grow-text-secondary">No usage events yet.</p>
                ) : (
                  events.slice(0, 8).map((event) => (
                    <div key={event.id} className="border-b border-grow-border/70 px-4 py-3 last:border-b-0">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-grow-text">{event.event_type || 'usage'}</span>
                        <span className="text-xs text-grow-text-muted">{formatDate(event.created_at)}</span>
                      </div>
                      <p className="mt-1 text-xs text-grow-text-secondary">
                        {toNumber(event.credits_delta)} credits, {toNumber(event.voice_minutes_delta)} voice min
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-grow-text">Top-up history</h3>
              </div>
              <div className="overflow-hidden rounded-lg border border-grow-border">
                {purchases.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-grow-text-secondary">No top-ups yet.</p>
                ) : (
                  purchases.slice(0, 8).map((purchase) => (
                    <div key={purchase.id} className="border-b border-grow-border/70 px-4 py-3 last:border-b-0">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-grow-text">{purchase.credits} credits</span>
                        <span className="text-xs text-grow-text-muted">{purchase.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-grow-text-secondary">
                        {formatMoney(purchase.amount_cents)} - {formatDate(purchase.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function planName(plan: GrowUsage['plan']): string {
  const labels: Record<GrowUsage['plan'], string> = {
    starter: 'Starter',
    agency: 'Agency',
    agency_pro: 'Agency Pro',
  };
  return labels[plan];
}

function formatRemaining(remaining: number, total: number): string {
  return `${formatNumber(remaining)}/${formatNumber(total)}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

function toNumber(value: number | string | null | undefined): number {
  return typeof value === 'number' ? value : Number(value || 0);
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function usageStateLabel(state: GrowUsage['warningState']): string {
  const labels: Record<GrowUsage['warningState'], string> = {
    ok: 'Normal',
    near_limit: '80% warning',
    limit_reached: 'Allowance used',
    spend_blocked: 'Spend blocked',
  };
  return labels[state];
}

function usageStateClass(state: GrowUsage['warningState']): string {
  const classes: Record<GrowUsage['warningState'], string> = {
    ok: 'rounded-md border border-grow-border px-2 py-0.5 text-[11px] text-grow-text-secondary',
    near_limit: 'rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200',
    limit_reached: 'rounded-md border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-200',
    spend_blocked: 'rounded-md border border-red-400/50 bg-red-500/15 px-2 py-0.5 text-[11px] text-red-100',
  };
  return classes[state];
}

/* Compact list item for campaigns (matching screenshot layout) */
function CampaignListItem({ campaign, onClick, index }: { campaign: Campaign; onClick: () => void; index: number }) {
  const foundCount = campaign.leads.length || campaign.stats.scraped;
  const statusColors: Record<string, string> = {
    running: 'text-grow-accent bg-grow-accent/10 border-grow-accent/20',
    complete: 'text-green-300 bg-green-500/10 border-green-500/20',
    pending: 'text-grow-text-secondary bg-white/[0.04] border-white/[0.06]',
    failed: 'text-red-300 bg-red-500/10 border-red-500/20',
  };

  const statusLabels: Record<string, string> = {
    running: 'running',
    complete: 'complete',
    pending: 'pending',
    failed: 'failed',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="group grid w-full grid-cols-12 gap-3 border-b border-grow-border/70 px-4 py-4 text-left cursor-pointer hover:bg-grow-surface transition-all opacity-0 animate-fade-in-up last:border-b-0"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'forwards' }}
    >
      <div className="col-span-12 md:col-span-5">
        <h3 className="text-grow-text font-medium text-[15px] group-hover:text-grow-accent transition-colors">
          {campaign.niche} in {campaign.city}
        </h3>
        <p className="text-grow-text-secondary text-xs mt-0.5">
          {campaign.clientName ? `${campaign.clientName} · ` : ''}Started {campaign.startedAt}
        </p>
      </div>
      <div className="col-span-5 md:col-span-2 flex items-center">
        <span className="text-sm text-grow-text">{foundCount}/{campaign.totalLeads}</span>
        <span className="ml-1.5 text-xs text-grow-text-muted">found</span>
      </div>
      <div className="col-span-4 md:col-span-3 flex items-center">
        <div className="h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-grow-border">
          <div className="h-full rounded-full bg-grow-accent" style={{ width: `${campaign.progress}%` }} />
        </div>
        <span className="ml-3 text-xs text-grow-text-secondary">{campaign.progress}%</span>
      </div>
      <div className="col-span-3 md:col-span-2 flex items-center justify-end gap-3">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-md border ${statusColors[campaign.status]}`}>
          {statusLabels[campaign.status]}
        </span>
        <span className="hidden text-xs font-medium text-grow-accent md:inline">View leads</span>
        <ArrowUpRight size={15} className="hidden text-grow-text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-grow-text md:block" />
      </div>
    </button>
  );
}
