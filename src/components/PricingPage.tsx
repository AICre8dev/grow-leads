import { CheckCircle2, CreditCard, Gauge, Sparkles, Users, Zap } from 'lucide-react';
import { CreditPack } from '../types';

interface PricingPageProps {
  creditPacks: CreditPack[];
  onAddCredits: (packId?: string) => void;
  isStartingCheckout: boolean;
}

const plans = [
  {
    name: 'Starter',
    price: '$49/mo',
    summary: 'For one active customer or one focused investor/customer push.',
    clients: '1 client',
    credits: '100 credits/month',
    voice: '200 voice minutes/month',
    features: [
      'Customer and investor research inbox',
      'Lead campaigns and preview-site workflow',
      'Usage safety caps',
    ],
  },
  {
    name: 'Agency',
    price: '$149/mo',
    summary: 'For a small pipeline across multiple customer or investor campaigns.',
    clients: '5 clients',
    credits: '500 credits/month',
    voice: '600 voice minutes/month',
    featured: true,
    features: [
      'Multi-client campaign tracking',
      'Research queue for customers and investors',
      'Credit top-ups for bigger pushes',
    ],
  },
  {
    name: 'Agency Pro',
    price: '$349/mo',
    summary: 'For running a wider acquisition desk with more campaigns in motion.',
    clients: '20 clients',
    credits: '2,000 credits/month',
    voice: '2,000 voice minutes/month',
    features: [
      'High-volume campaign capacity',
      'More preview and outreach room',
      'Best fit for repeat agency workflows',
    ],
  },
];

const fallbackPacks: CreditPack[] = [
  { id: 'small', label: '100 credits', credits: 100, amountCents: 3900 },
  { id: 'medium', label: '500 credits', credits: 500, amountCents: 14900 },
  { id: 'large', label: '2,000 credits', credits: 2000, amountCents: 49900 },
];

export default function PricingPage({ creditPacks, onAddCredits, isStartingCheckout }: PricingPageProps) {
  const packs = creditPacks.length > 0 ? creditPacks : fallbackPacks;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 md:px-6">
      <section className="mb-6 rounded-lg border border-grow-border bg-grow-card p-5 opacity-0 animate-fade-in-up md:p-6" style={{ animationFillMode: 'forwards' }}>
        <div className="grid gap-5 lg:grid-cols-[1fr_0.72fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-grow-accent/20 bg-grow-accent/10 px-3 py-1.5 text-xs text-grow-accent">
              <Sparkles size={13} />
              Pricing
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-grow-text md:text-5xl">Plans for customer and investor acquisition</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-grow-text-secondary md:text-base">
              Keep the plan simple: monthly credits for campaign work, client capacity for active accounts, and top-ups when you want a bigger push.
            </p>
          </div>

          <div className="rounded-lg border border-grow-border bg-grow-bg p-4">
            <div className="flex items-center gap-2 text-xs text-grow-text-secondary">
              <Gauge size={14} className="text-grow-accent" />
              Best current default
            </div>
            <div className="mt-2 text-2xl font-semibold text-grow-text">Agency</div>
            <p className="mt-2 text-sm leading-6 text-grow-text-secondary">
              Use this as the core offer while you are selling both customers and investors. It has enough room for 5 client/pipeline tracks.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`flex min-h-[360px] flex-col rounded-lg border p-5 opacity-0 animate-fade-in-up ${
              plan.featured
                ? 'border-grow-accent/50 bg-grow-accent/10 shadow-[0_24px_80px_rgba(255,122,26,0.08)]'
                : 'border-grow-border bg-grow-card'
            }`}
            style={{ animationFillMode: 'forwards' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-grow-text">{plan.name}</h2>
                <p className="mt-2 text-sm leading-6 text-grow-text-secondary">{plan.summary}</p>
              </div>
              {plan.featured && (
                <span className="rounded-md bg-grow-accent px-2 py-1 text-[10px] font-semibold text-black">core</span>
              )}
            </div>

            <div className="mt-5 text-3xl font-semibold text-grow-text">{plan.price}</div>

            <div className="mt-5 grid gap-2">
              <PlanStat icon={Users} label={plan.clients} />
              <PlanStat icon={Zap} label={plan.credits} />
              <PlanStat icon={Gauge} label={plan.voice} />
            </div>

            <ul className="mt-5 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm leading-6 text-grow-text-secondary">
                  <CheckCircle2 size={15} className="mt-1 shrink-0 text-grow-accent" />
                  {feature}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-lg border border-grow-border bg-grow-card p-5 md:p-6">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-grow-text-secondary">
              <CreditCard size={14} className="text-grow-accent" />
              Credit top-ups
            </div>
            <h2 className="mt-1 text-xl font-semibold text-grow-text">Add capacity for a bigger campaign run</h2>
          </div>
          <span className="rounded-md border border-grow-border bg-grow-bg px-3 py-1.5 text-[11px] text-grow-text-secondary">
            one-time packs
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {packs.map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={() => onAddCredits(pack.id)}
              disabled={isStartingCheckout}
              className="rounded-md border border-grow-border bg-grow-bg p-4 text-left transition-colors hover:border-grow-accent/50 hover:bg-grow-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="text-sm font-semibold text-grow-text">{pack.label || `${pack.credits} credits`}</div>
              <div className="mt-2 text-2xl font-semibold text-grow-text">{formatMoney(pack.amountCents)}</div>
              <div className="mt-1 text-xs text-grow-text-secondary">{pack.credits.toLocaleString()} extra credits</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function PlanStat({ icon: Icon, label }: { icon: typeof Users; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-grow-border bg-grow-bg px-3 py-2 text-sm text-grow-text-secondary">
      <Icon size={14} className="text-grow-accent" />
      {label}
    </div>
  );
}

function formatMoney(amountCents?: number): string {
  if (!amountCents) return 'Custom';
  return `$${Math.round(amountCents / 100).toLocaleString()}`;
}
