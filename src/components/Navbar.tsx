import { useState } from 'react';
import { AudioLines, CreditCard, LayoutDashboard, LogOut, Moon, Network, Settings, Sun } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('grow-theme', next ? 'dark' : 'day');
    } catch {
      /* ignore */
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-grow-bg/85 backdrop-blur-xl border-b border-grow-border flex items-center justify-between px-4 md:px-6">
      {/* Left: Logo */}
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
        <div className="w-8 h-8 bg-gradient-to-br from-grow-accent to-sky-500 text-white rounded-[9px] flex items-center justify-center shadow-[0_6px_16px_rgba(22,179,100,0.35)]">
          <AudioLines size={17} strokeWidth={2.4} />
        </div>
        <div className="hidden sm:block">
          <span className="text-grow-text font-semibold text-sm tracking-tight">Grow Leads Agent</span>
          <span className="ml-2 text-[11px] text-grow-text-muted">revenue ops</span>
        </div>
      </div>

      {/* Right: Nav items */}
      <div className="flex items-center gap-1">
        <button
          aria-label="Dashboard"
          onClick={() => onNavigate('dashboard')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
            currentPage === 'dashboard'
              ? 'text-grow-text bg-grow-card border border-grow-border'
              : 'text-grow-text-secondary hover:text-grow-text hover:bg-white/[0.04]'
          }`}
        >
          <LayoutDashboard size={15} />
          <span className="hidden sm:inline">Dashboard</span>
        </button>
        <button
          aria-label="Research"
          onClick={() => onNavigate('research')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
            currentPage === 'research'
              ? 'text-grow-text bg-grow-card border border-grow-border'
              : 'text-grow-text-secondary hover:text-grow-text hover:bg-white/[0.04]'
          }`}
        >
          <Network size={15} />
          <span className="hidden sm:inline">Research</span>
        </button>
        <button
          aria-label="Pricing"
          onClick={() => onNavigate('pricing')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
            currentPage === 'pricing'
              ? 'text-grow-text bg-grow-card border border-grow-border'
              : 'text-grow-text-secondary hover:text-grow-text hover:bg-white/[0.04]'
          }`}
        >
          <CreditCard size={15} />
          <span className="hidden sm:inline">Pricing</span>
        </button>
        <button
          aria-label="Settings"
          onClick={() => onNavigate('settings')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
            currentPage === 'settings'
              ? 'text-grow-text bg-grow-card border border-grow-border'
              : 'text-grow-text-secondary hover:text-grow-text hover:bg-white/[0.04]'
          }`}
        >
          <Settings size={15} />
          <span className="hidden sm:inline">Settings</span>
        </button>

        <button
          aria-label="Toggle day/night theme"
          onClick={toggleTheme}
          title={dark ? 'Switch to day' : 'Switch to night'}
          className="flex items-center justify-center w-9 h-9 rounded-md text-grow-text-secondary hover:text-grow-text hover:bg-grow-surface transition-colors"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="w-px h-5 bg-grow-border mx-2" />

        <span className="text-grow-text-secondary text-xs hidden md:block mr-2">hello@growagency.co</span>

        <button aria-label="Log out" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-grow-text-secondary hover:text-grow-text hover:bg-white/[0.04] transition-colors">
          <span className="hidden sm:inline">Log out</span>
          <LogOut size={14} />
        </button>
      </div>
    </nav>
  );
}
