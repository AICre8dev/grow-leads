import { useState, useCallback, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import CampaignDetail from './components/CampaignDetail';
import SettingsPage from './components/SettingsPage';
import ToastContainer from './components/ToastContainer';
import { Campaign, Settings, Toast } from './types';
import { defaultSettings } from './data/mockData';
import { createCampaign, getCampaign, listCampaigns } from './lib/api';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

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

  const refreshCampaigns = useCallback(async (showError = false) => {
    try {
      const nextCampaigns = await listCampaigns();
      setCampaigns(nextCampaigns);
    } catch (e) {
      if (showError) {
        addToast((e as Error).message || 'Could not load campaigns', 'error');
      }
    } finally {
      setIsLoadingCampaigns(false);
    }
  }, [addToast]);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setSelectedCampaignId(null);
  };

  const refreshSelectedCampaign = useCallback(async (id: string, showLoading = true) => {
    if (showLoading) setIsLoadingDetail(true);
    try {
      const detail = await getCampaign(id);
      setCampaigns((prev) => prev.map((campaign) => (campaign.id === id ? detail : campaign)));
    } catch (e) {
      addToast((e as Error).message || 'Could not load campaign detail', 'error');
    } finally {
      if (showLoading) setIsLoadingDetail(false);
    }
  }, [addToast]);

  useEffect(() => {
    refreshCampaigns(true);
  }, [refreshCampaigns]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      refreshCampaigns(false);
      if (selectedCampaignId) {
        refreshSelectedCampaign(selectedCampaignId, false);
      }
    }, 15_000);

    return () => window.clearInterval(interval);
  }, [refreshCampaigns, refreshSelectedCampaign, selectedCampaignId]);

  const handleSelectCampaign = (id: string) => {
    setSelectedCampaignId(id);
    setCurrentPage('campaign-detail');
    refreshSelectedCampaign(id);
  };

  const handleCreateCampaign = async (data: {
    niche: string;
    city: string;
    totalLeads: number;
    emailTemplate: string;
  }): Promise<boolean> => {
    setIsCreatingCampaign(true);
    try {
      const campaign = await createCampaign(data);
      setCampaigns((prev) => [campaign, ...prev]);
      addToast(`Campaign "${data.niche} in ${data.city}" started`, 'success');
      return true;
    } catch (e) {
      addToast((e as Error).message || 'Could not create campaign', 'error');
      return false;
    } finally {
      setIsCreatingCampaign(false);
    }
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

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
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
          isLoading={isLoadingCampaigns}
          isCreating={isCreatingCampaign}
        />
      )}

      {currentPage === 'campaign-detail' && selectedCampaign && (
        <CampaignDetail
          campaign={selectedCampaign}
          onBack={() => handleNavigate('dashboard')}
          onDownloadCsv={handleDownloadCsv}
          isLoading={isLoadingDetail}
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
