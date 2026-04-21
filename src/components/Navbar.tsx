import React from 'react';
import { LayoutDashboard, Settings, LogOut } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Navbar({ currentPage, onNavigate }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-grow-surface/80 backdrop-blur-xl border-b border-grow-border flex items-center justify-between px-4 md:px-6">
      {/* Left: Logo */}
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
        <div className="w-8 h-8 bg-grow-accent rounded-[6px] flex items-center justify-center">
          <span className="text-white font-bold text-sm tracking-tight">GL</span>
        </div>
        <span className="text-grow-text font-semibold text-sm tracking-tight hidden sm:block">Grow Leads</span>
      </div>

      {/* Right: Nav items */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
            currentPage === 'dashboard'
              ? 'text-grow-accent bg-grow-accent/10'
              : 'text-grow-text-secondary hover:text-grow-text hover:bg-white/[0.04]'
          }`}
        >
          <LayoutDashboard size={15} />
          <span className="hidden sm:inline">Dashboard</span>
        </button>
        <button
          onClick={() => onNavigate('settings')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
            currentPage === 'settings'
              ? 'text-grow-accent bg-grow-accent/10'
              : 'text-grow-text-secondary hover:text-grow-text hover:bg-white/[0.04]'
          }`}
        >
          <Settings size={15} />
          <span className="hidden sm:inline">Settings</span>
        </button>

        <div className="w-px h-5 bg-grow-border mx-2" />

        <span className="text-grow-text-secondary text-xs hidden md:block mr-2">hello@growagency.com</span>

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-grow-text-secondary hover:text-grow-text hover:bg-white/[0.04] transition-colors">
          <span className="hidden sm:inline">Log out</span>
          <LogOut size={14} />
        </button>
      </div>
    </nav>
  );
}
