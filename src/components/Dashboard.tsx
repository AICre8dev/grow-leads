import React from 'react';
import { Campaign } from '../types';
import CampaignCard from './CampaignCard';
import NewCampaignInline from './NewCampaignInline';

interface DashboardProps {
  campaigns: Campaign[];
  onNewCampaign: (data: { niche: string; city: string; totalLeads: number; emailTemplate: string }) => void;
  onSelectCampaign: (id: string) => void;
}

export default function Dashboard({ campaigns, onNewCampaign, onSelectCampaign }: DashboardProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 pt-24 pb-16">
      {/* Inline New Campaign Form */}
      <NewCampaignInline onCreate={onNewCampaign} />

      {/* My Campaigns */}
      <div className="mt-10">
        <h2 className="text-grow-text font-semibold text-lg mb-4">My Campaigns</h2>

        {campaigns.length === 0 ? (
          <div className="text-center py-16 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
            <p className="text-grow-text-secondary text-sm">No campaigns yet. Create your first one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
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
    </div>
  );
}

/* Compact list item for campaigns (matching screenshot layout) */
function CampaignListItem({ campaign, onClick, index }: { campaign: Campaign; onClick: () => void; index: number }) {
  const statusColors: Record<string, string> = {
    running: 'text-blue-400 bg-blue-500/10',
    complete: 'text-green-400 bg-green-500/10',
    pending: 'text-grow-text-secondary bg-white/[0.04]',
    failed: 'text-red-400 bg-red-500/10',
  };

  const statusLabels: Record<string, string> = {
    running: 'running',
    complete: 'complete',
    pending: 'pending',
    failed: 'failed',
  };

  return (
    <div
      onClick={onClick}
      className="group flex items-center justify-between bg-grow-card border border-grow-border rounded-xl px-5 py-4 cursor-pointer hover:border-grow-border-hover hover:bg-grow-card/80 transition-all opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'forwards' }}
    >
      <div>
        <h3 className="text-grow-text font-medium text-[15px] group-hover:text-grow-accent transition-colors">
          {campaign.niche} in {campaign.city}
        </h3>
        <p className="text-grow-text-secondary text-xs mt-0.5">
          {campaign.totalLeads} leads · {campaign.startedAt}
        </p>
      </div>
      <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusColors[campaign.status]}`}>
        {statusLabels[campaign.status]}
      </span>
    </div>
  );
}
