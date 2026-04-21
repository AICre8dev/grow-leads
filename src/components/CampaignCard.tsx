import React from 'react';
import { Campaign } from '../types';
import ProgressBar from './ProgressBar';
import { Globe, Mail, Zap } from 'lucide-react';

interface CampaignCardProps {
  campaign: Campaign;
  onClick: () => void;
  index: number;
}

export default function CampaignCard({ campaign, onClick, index }: CampaignCardProps) {
  const statusColors: Record<string, string> = {
    running: 'text-blue-400',
    complete: 'text-green-400',
    pending: 'text-grow-text-secondary',
    failed: 'text-red-400',
  };

  const statusBg: Record<string, string> = {
    running: 'bg-blue-500/10',
    complete: 'bg-green-500/10',
    pending: 'bg-white/[0.04]',
    failed: 'bg-red-500/10',
  };

  const statusLabels: Record<string, string> = {
    running: 'Running',
    complete: 'Complete',
    pending: 'Pending',
    failed: 'Failed',
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-grow-card border border-grow-border rounded-xl p-5 cursor-pointer hover:border-grow-border-hover hover:bg-grow-card/80 transition-all opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-grow-text font-medium text-[15px] group-hover:text-grow-accent transition-colors">
            {campaign.niche} in {campaign.city}
          </h3>
          <p className="text-grow-text-secondary text-xs mt-1">
            {campaign.totalLeads} leads · Started {campaign.startedAt}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {campaign.status === 'running' && (
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          )}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[campaign.status]} ${statusBg[campaign.status]}`}>
            {statusLabels[campaign.status]}
          </span>
        </div>
      </div>

      <ProgressBar value={campaign.progress} className="mb-4" />

      <div className="flex items-center gap-4 text-xs text-grow-text-secondary">
        <div className="flex items-center gap-1.5">
          <Globe size={12} className="text-grow-text-muted" />
          <span>Sites: <span className="text-grow-text">{campaign.stats.sitesBuilt}</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Mail size={12} className="text-grow-text-muted" />
          <span>Emails: <span className="text-grow-text">{campaign.stats.emailsSent}</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap size={12} className="text-grow-text-muted" />
          <span>CRM: <span className="text-grow-text">{campaign.stats.addedToCrm}</span></span>
        </div>
      </div>
    </div>
  );
}
