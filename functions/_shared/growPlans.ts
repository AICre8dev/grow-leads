export type GrowPlanCode = 'starter' | 'agency' | 'agency_pro';
export type CreditPackId = 'small' | 'medium' | 'large';

export interface GrowPlanAllowance {
  code: GrowPlanCode;
  label: string;
  monthlyPriceCents: number;
  clientLimit: number;
  growCredits: number;
  voiceMinutes: number;
}

export interface GrowCreditPack {
  id: CreditPackId;
  label: string;
  credits: number;
  amountCents: number;
}

export const GROW_PLANS: GrowPlanAllowance[] = [
  {
    code: 'starter',
    label: 'Starter',
    monthlyPriceCents: 4_900,
    clientLimit: 1,
    growCredits: 100,
    voiceMinutes: 200,
  },
  {
    code: 'agency',
    label: 'Agency',
    monthlyPriceCents: 14_900,
    clientLimit: 5,
    growCredits: 500,
    voiceMinutes: 600,
  },
  {
    code: 'agency_pro',
    label: 'Agency Pro',
    monthlyPriceCents: 34_900,
    clientLimit: 20,
    growCredits: 2_000,
    voiceMinutes: 2_000,
  },
];

export const GROW_CREDIT_PACKS: GrowCreditPack[] = [
  { id: 'small', label: '100 credits', credits: 100, amountCents: 3_900 },
  { id: 'medium', label: '500 credits', credits: 500, amountCents: 14_900 },
  { id: 'large', label: '2,000 credits', credits: 2_000, amountCents: 49_900 },
];

export function findGrowCreditPack(id: string): GrowCreditPack | null {
  return GROW_CREDIT_PACKS.find((pack) => pack.id === id) || null;
}

export function findGrowPlan(code: string): GrowPlanAllowance {
  return GROW_PLANS.find((plan) => plan.code === code) || GROW_PLANS[0];
}

