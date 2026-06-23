import { useState } from 'react';
import { ArrowLeft, ExternalLink, Download, Star } from 'lucide-react';
import { Campaign } from '../types';
import { getReviewOpportunity, getRankBand, getWebsiteOpportunity } from '../lib/opportunity';
import ProgressBar from './ProgressBar';
import StatusPill from './StatusPill';

interface CampaignDetailProps {
  campaign: Campaign;
  onBack: () => void;
  onDownloadCsv: () => void;
  isLoading: boolean;
}

export default function CampaignDetail({ campaign, onBack, onDownloadCsv, isLoading }: CampaignDetailProps) {
  const [reviewOppOnly, setReviewOppOnly] = useState(false);

  // Only show contactable businesses — those with a phone number.
  const contactableLeads = campaign.leads.filter((lead) => lead.phone && lead.phone.trim() !== '');
  const leadsWithOpp = contactableLeads.map((lead) => ({
    lead,
    opp: getReviewOpportunity(lead),
    web: getWebsiteOpportunity(lead),
  }));
  const reviewOppCount = leadsWithOpp.filter((x) => x.opp.isOpportunity).length;
  const displayedLeads = reviewOppOnly ? leadsWithOpp.filter((x) => x.opp.isOpportunity) : leadsWithOpp;

  const foundCount = contactableLeads.length || campaign.stats.scraped;
  const buildBlockedCount = campaign.leads.filter(
    (lead) => lead.status === 'failed' && /project limit|AICre8/i.test(lead.errorMessage || ''),
  ).length;
  const processedCount = campaign.leads.filter(
    (l) =>
      l.status === 'email_sent' ||
      l.status === 'added_to_crm' ||
      l.status === 'building' ||
      l.status === 'scraping' ||
      l.status === 'failed'
  ).length;

  const stages = [
    { label: 'Search Results', value: foundCount },
    { label: 'Site Built', value: campaign.stats.sitesBuilt },
    { label: 'Added to CRM', value: campaign.stats.addedToCrm },
    { label: 'Outreach Sent', value: campaign.stats.emailsSent },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 pt-24 pb-16">
      {/* Breadcrumb */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-grow-text-secondary hover:text-grow-text text-sm mb-6 transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        My Campaigns
      </button>

      {/* Title */}
      <div className="mb-8 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
        <h1 className="font-serif text-3xl md:text-4xl text-grow-text mb-2">
          {campaign.niche} in {campaign.city}
        </h1>
        <p className="text-grow-text-secondary text-sm">
          {campaign.clientName ? `${campaign.clientName} · ` : ''}{foundCount} found · {campaign.totalLeads} requested · Started {campaign.startedAt}
          {isLoading ? ' · Refreshing...' : ''}
        </p>
      </div>

      {foundCount > 0 && (
        <div
          className="mb-6 rounded-lg border border-grow-border bg-grow-card p-4 opacity-0 animate-fade-in-up"
          style={{ animationDelay: '40ms', animationFillMode: 'forwards' }}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-grow-text text-sm font-semibold">Search results are in</h2>
              <p className="mt-1 text-sm text-grow-text-secondary">
                {foundCount} businesses were found and saved. You can use these leads even before preview sites or emails are ready.
              </p>
            </div>
            {buildBlockedCount > 0 && (
              <span className="inline-flex rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300">
                {buildBlockedCount} preview builds blocked by AICre8 project limit
              </span>
            )}
          </div>
        </div>
      )}

      {/* Overall Progress Card */}
      <div
        className="bg-grow-card border border-grow-border rounded-xl p-6 mb-8 opacity-0 animate-fade-in-up"
        style={{ animationDelay: '80ms', animationFillMode: 'forwards' }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-grow-text-secondary text-sm font-medium">Overall Progress</span>
          <span className="text-grow-text text-2xl font-semibold">{campaign.progress}%</span>
        </div>
        <ProgressBar value={campaign.progress} height="h-2" className="mb-5" />
        <div className="grid grid-cols-4 gap-4">
          {stages.map((stage) => (
            <div key={stage.label} className="text-center">
              <div className="text-grow-text text-lg font-semibold">{stage.value}</div>
              <div className="text-grow-text-secondary text-xs mt-0.5">{stage.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Opportunity filter bar */}
      {reviewOppCount > 0 && (
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-xs text-grow-text-secondary">
            <span className="font-semibold text-amber-300">{reviewOppCount}</span> of {foundCount} have a Google review opportunity
          </span>
          <button
            onClick={() => setReviewOppOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              reviewOppOnly
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                : 'border-grow-border text-grow-text-secondary hover:border-grow-border-hover'
            }`}
          >
            <Star size={12} className={reviewOppOnly ? 'fill-amber-300' : ''} />
            {reviewOppOnly ? 'Showing review opportunities' : 'Review opportunities only'}
          </button>
        </div>
      )}

      {/* Leads Table */}
      <div
        className="bg-grow-card border border-grow-border rounded-xl overflow-hidden opacity-0 animate-fade-in-up"
        style={{ animationDelay: '160ms', animationFillMode: 'forwards' }}
      >
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-grow-border bg-grow-surface/50">
          <div className="col-span-5 text-[11px] font-medium text-grow-text-secondary uppercase tracking-wider">
            Search Result
          </div>
          <div className="col-span-3 text-[11px] font-medium text-grow-text-secondary uppercase tracking-wider hidden md:block">
            Contact
          </div>
          <div className="col-span-2 text-[11px] font-medium text-grow-text-secondary uppercase tracking-wider">
            Status
          </div>
          <div className="col-span-2 text-[11px] font-medium text-grow-text-secondary uppercase tracking-wider text-right">
            Action
          </div>
        </div>

        {/* Table Rows */}
        {campaign.leads.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-grow-text-secondary text-sm">
              {campaign.status === 'running' ? 'Scrape running. Leads will appear here soon.' : 'No leads found for this campaign.'}
            </p>
          </div>
        ) : (
          displayedLeads.map(({ lead, opp, web }, index) => (
            <div
              key={lead.id}
              className="grid grid-cols-12 gap-4 px-5 py-3.5 border-b border-grow-border/50 hover:bg-white/[0.02] transition-colors items-center opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${200 + index * 50}ms`, animationFillMode: 'forwards' }}
            >
              <div className="col-span-5 min-w-0">
                <div className="flex items-center gap-2">
                  {typeof lead.mapRank === 'number' && (
                    <span
                      className={`flex-none rounded px-1.5 py-0.5 text-[11px] font-semibold border ${
                        getRankBand(lead) === 'striking'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-grow-surface text-grow-text-muted border-grow-border'
                      }`}
                      title={`Map-pack rank #${lead.mapRank}`}
                    >
                      #{lead.mapRank}
                    </span>
                  )}
                  <span className="truncate text-sm text-grow-text">{lead.businessName}</span>
                  {getRankBand(lead) === 'striking' && (
                    <span className="flex-none rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                      Striking distance
                    </span>
                  )}
                </div>
                <span className="mt-1 block truncate text-xs text-grow-text-muted">
                  {lead.address || 'No address found'}
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-xs">
                  {web.hasSite ? (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-grow-accent hover:underline max-w-[230px]"
                    >
                      {lead.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <span className="text-grow-text-muted">No website</span>
                  )}
                  {web.label && (
                    <span
                      className={`flex-none rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                        !web.hasSite
                          ? 'border-red-500/40 bg-red-500/10 text-red-300'
                          : web.isOpportunity
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      }`}
                      title={web.pitch ? `${web.label} — ${web.pitch}` : web.label}
                    >
                      {web.label}
                    </span>
                  )}
                </span>
                {(lead.rating || lead.reviewsCount) && (
                  <span className="mt-1 block text-xs text-grow-text-secondary">
                    {lead.rating ? `${lead.rating.toFixed(1)} rating` : 'Rating not found'}
                    {lead.reviewsCount ? ` · ${lead.reviewsCount} reviews` : ''}
                  </span>
                )}
                {opp.isOpportunity && (
                  <span
                    className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300"
                    title={`Review opportunity: ${opp.reasons.join(', ')}`}
                  >
                    <Star size={10} className="fill-amber-300" />
                    {opp.pitch} · {opp.reasons.join(' · ')}
                  </span>
                )}
              </div>
              <div className="col-span-3 hidden md:block">
                <span className="block text-sm text-grow-text-secondary font-mono">{lead.phone || 'No phone'}</span>
                <span className="mt-1 block truncate text-xs text-grow-text-muted">{lead.email || 'No email found'}</span>
              </div>
              <div className="col-span-2">
                <StatusPill status={lead.status} errorMessage={lead.errorMessage} />
              </div>
              <div className="col-span-2 text-right">
                {lead.previewUrl ? (
                  <a
                    href={lead.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-grow-accent text-sm hover:text-grow-accent-hover transition-colors font-medium"
                  >
                    Preview Site
                    <ExternalLink size={12} />
                  </a>
                ) : (
                  <span className="text-grow-text-muted text-sm">
                    {lead.status === 'failed' && /project limit|AICre8/i.test(lead.errorMessage || '')
                      ? 'Lead saved'
                      : lead.status === 'failed'
                        ? 'Needs review'
                        : 'Result saved'}
                  </span>
                )}
              </div>
            </div>
          ))
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-grow-surface/30">
          <span className="text-grow-text-secondary text-xs">
            {foundCount} search results shown · {processedCount} processed · {campaign.totalLeads} requested
          </span>
          <button
            onClick={onDownloadCsv}
            className="flex items-center gap-2 px-3 py-1.5 bg-grow-surface border border-grow-border rounded-lg text-xs text-grow-text hover:border-grow-border-hover transition-colors"
          >
            <Download size={12} />
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
}
