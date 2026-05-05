import { useState, type FormEvent } from 'react';
import { Settings } from '../types';
import { Save, Eye, EyeOff, Key } from 'lucide-react';

interface SettingsPageProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
}

export default function SettingsPage({ settings, onSave }: SettingsPageProps) {
  const [form, setForm] = useState<Settings>({ ...settings });
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApifyToken, setShowApifyToken] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  const inputClass =
    'w-full bg-grow-surface border border-grow-border rounded-lg px-4 py-3 text-sm text-grow-text placeholder-grow-text-muted focus:outline-none focus:border-grow-accent/50 focus:ring-1 focus:ring-grow-accent/20 transition-colors';

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 pt-24 pb-16">
      <h1 className="font-serif text-2xl md:text-3xl text-grow-text mb-8 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
        Settings
      </h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Email Sender */}
        <section
          className="bg-grow-card border border-grow-border rounded-xl p-6 opacity-0 animate-fade-in-up"
          style={{ animationDelay: '80ms', animationFillMode: 'forwards' }}
        >
          <h2 className="text-grow-text font-medium text-sm mb-5 flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-grow-surface flex items-center justify-center">
              <span className="text-xs">✉️</span>
            </div>
            Email Sender
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-grow-text-secondary uppercase tracking-wider mb-2">
                From Name
              </label>
              <input
                type="text"
                value={form.fromName}
                onChange={(e) => setForm({ ...form, fromName: e.target.value })}
                placeholder="Grow Leads"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-grow-text-secondary uppercase tracking-wider mb-2">
                Reply-To Email
              </label>
              <input
                type="email"
                value={form.replyTo}
                onChange={(e) => setForm({ ...form, replyTo: e.target.value })}
                placeholder="hello@growagency.co"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* API Keys */}
        <section
          className="bg-grow-card border border-grow-border rounded-xl p-6 opacity-0 animate-fade-in-up"
          style={{ animationDelay: '160ms', animationFillMode: 'forwards' }}
        >
          <h2 className="text-grow-text font-medium text-sm mb-5 flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-grow-surface flex items-center justify-center">
              <Key size={12} className="text-grow-text-secondary" />
            </div>
            API Keys
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-grow-text-secondary uppercase tracking-wider mb-2">
                AICre8 API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={form.aicre8ApiKey}
                  onChange={(e) => setForm({ ...form, aicre8ApiKey: e.target.value })}
                  placeholder="sk-aicre8-..."
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-grow-text-muted hover:text-grow-text-secondary transition-colors"
                >
                  {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-grow-text-secondary uppercase tracking-wider mb-2">
                Apify Token
              </label>
              <div className="relative">
                <input
                  type={showApifyToken ? 'text' : 'password'}
                  value={form.apifyToken}
                  onChange={(e) => setForm({ ...form, apifyToken: e.target.value })}
                  placeholder="apify_api_..."
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowApifyToken(!showApifyToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-grow-text-muted hover:text-grow-text-secondary transition-colors"
                >
                  {showApifyToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Email Template */}
        <section
          className="bg-grow-card border border-grow-border rounded-xl p-6 opacity-0 animate-fade-in-up"
          style={{ animationDelay: '240ms', animationFillMode: 'forwards' }}
        >
          <h2 className="text-grow-text font-medium text-sm mb-5 flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-grow-surface flex items-center justify-center">
              <span className="text-xs">📝</span>
            </div>
            Default Email Template
          </h2>
          <textarea
            value={form.emailTemplate}
            onChange={(e) => setForm({ ...form, emailTemplate: e.target.value })}
            rows={8}
            className={`${inputClass} resize-none font-mono text-xs leading-relaxed`}
          />
          <div className="flex gap-2 mt-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-grow-accent/10 text-grow-accent text-[10px] font-mono border border-grow-accent/20">
              {'{{business_name}}'}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-grow-accent/10 text-grow-accent text-[10px] font-mono border border-grow-accent/20">
              {'{{preview_url}}'}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-grow-accent/10 text-grow-accent text-[10px] font-mono border border-grow-accent/20">
              {'{{phone}}'}
            </span>
          </div>
        </section>

        {/* Save */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 bg-grow-accent hover:bg-grow-accent-hover text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            <Save size={14} />
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
