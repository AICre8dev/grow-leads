interface StatusPillProps {
  status: string;
  errorMessage?: string;
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-white/[0.06] text-grow-text-secondary border border-grow-border' },
  scraping: { label: 'Scraping', classes: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  building: { label: 'Building', classes: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  added_to_crm: { label: 'In CRM', classes: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
  email_sent: { label: 'Email Sent', classes: 'bg-green-500/10 text-green-400 border border-green-500/20' },
  failed: { label: 'Failed', classes: 'bg-red-500/10 text-red-400 border border-red-500/20' },
};

export default function StatusPill({ status, errorMessage }: StatusPillProps) {
  const isBuildBlocked = status === 'failed' && /project limit|AICre8/i.test(errorMessage || '');
  const config = isBuildBlocked
    ? { label: 'Build blocked', classes: 'bg-amber-500/10 text-amber-300 border border-amber-500/20' }
    : statusConfig[status] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes}`}>
      {status === 'scraping' && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 animate-pulse" />
      )}
      {status === 'building' && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5 animate-pulse" />
      )}
      {config.label}
    </span>
  );
}
