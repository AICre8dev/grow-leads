import React, { useState, useCallback } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import CampaignDetail from './components/CampaignDetail';
import SettingsPage from './components/SettingsPage';
import NewCampaignModal from './components/NewCampaignModal';
import ToastContainer from './components/ToastContainer';
import { Campaign, Settings, Toast } from './types';
import { mockCampaigns, defaultSettings } from './data/mockData';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 3000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setSelectedCampaignId(null);
  };

  const handleSelectCampaign = (id: string) => {
    setSelectedCampaignId(id);
    setCurrentPage('campaign-detail');
  };

  const handleCreateCampaign = (data: {
    niche: string;
    city: string;
    totalLeads: number;
    emailTemplate: string;
  }) => {
    const newCampaign: Campaign = {
      id: `camp-${Date.now()}`,
      niche: data.niche,
      city: data.city,
      totalLeads: data.totalLeads,
      progress: 0,
      status: 'pending',
      startedAt: 'Just now',
      emailTemplate: data.emailTemplate,
      stats: { scraped: 0, sitesBuilt: 0, addedToCrm: 0, emailsSent: 0 },
      leads: Array.from({ length: data.totalLeads }, (_, i) => ({
        id: `l-new-${Date.now()}-${i}`,
        businessName: `${data.niche} Business ${i + 1}`,
        phone: `(555) 000-${String(i).padStart(4, '0')}`,
        email: `info@business${i + 1}.com`,
        website: `business${i + 1}.com`,
        status: 'pending' as const,
      })),
    };
    setCampaigns((prev) => [newCampaign, ...prev]);
    addToast(`Campaign "${data.niche} in ${data.city}" created`, 'success');
  };

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    addToast('Settings saved successfully', 'success');
  };

  const handleDownloadCsv = () => {
    const campaign = campaigns.find((c) => c.id === selectedCampaignId);
    if (!campaign) return;

    const headers = ['Business Name', 'Phone', 'Email', 'Website', 'Status', 'Preview URL'];
    const rows = campaign.leads.map((l) => [
      l.businessName,
      l.phone,
      l.email,
      l.website,
      l.status,
      l.previewUrl || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaign.niche}-${campaign.city}-leads.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('CSV downloaded', 'success');
  };

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  const navPage =
    currentPage === 'campaign-detail' ? 'dashboard' : currentPage;

  return (
    <div className="min-h-screen bg-grow-bg text-grow-text font-sans">
      <Navbar currentPage={navPage} onNavigate={handleNavigate} />

      {currentPage === 'dashboard' && (
        <Dashboard
          campaigns={campaigns}
          onNewCampaign={handleCreateCampaign}
          onSelectCampaign={handleSelectCampaign}
        />
      )}

      {currentPage === 'campaign-detail' && selectedCampaign && (
        <CampaignDetail
          campaign={selectedCampaign}
          onBack={() => handleNavigate('dashboard')}
          onDownloadCsv={handleDownloadCsv}
        />
      )}

      {currentPage === 'settings' && (
        <SettingsPage settings={settings} onSave={handleSaveSettings} />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Built with AICre8 badge */}
      <div className="fixed bottom-4 left-4 z-50">
        <a
          href="https://aicre8.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-grow-card border border-grow-border text-[10px] text-grow-text-secondary hover:text-grow-text hover:border-grow-border-hover transition-colors"
        >
          Built with <span className="font-semibold text-grow-text">AICre8</span>
        </a>
      </div>
    </div>
  );
}
