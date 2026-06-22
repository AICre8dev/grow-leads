import type { getSupabase } from './supabase';

export interface CreditSummary {
  availableCredits: number;
  reservedCredits: number;
  lifetimeCreditsSpent: number;
}

interface CreditAccountRow {
  available_credits: number;
  reserved_credits: number;
  lifetime_credits_spent: number;
}

interface ReserveCreditsRow {
  event_id: string;
  available_credits: number;
  reserved_credits: number;
}

export async function getCreditSummary(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
): Promise<CreditSummary> {
  const { data, error } = await supabase
    .from('grow_credit_accounts')
    .select('available_credits, reserved_credits, lifetime_credits_spent')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const account = data as CreditAccountRow | null;
  return {
    availableCredits: account?.available_credits || 0,
    reservedCredits: account?.reserved_credits || 0,
    lifetimeCreditsSpent: account?.lifetime_credits_spent || 0,
  };
}

export async function reserveCredits(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  amount: number,
  metadata: Record<string, unknown>,
): Promise<{ eventId: string; summary: CreditSummary }> {
  const { data, error } = await supabase.rpc('reserve_grow_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_metadata: metadata,
  });

  if (error) throw new Error(error.message);

  const reservation = (data as ReserveCreditsRow[] | null)?.[0];
  if (!reservation) throw new Error('Could not reserve credits');

  return {
    eventId: reservation.event_id,
    summary: {
      availableCredits: reservation.available_credits,
      reservedCredits: reservation.reserved_credits,
      lifetimeCreditsSpent: 0,
    },
  };
}

export async function grantCredits(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  amount: number,
  metadata: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await supabase.rpc('grant_grow_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_metadata: metadata,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function refundReservedCredits(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  campaignId: string | null,
  amount: number,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.rpc('refund_reserved_grow_credits', {
    p_user_id: userId,
    p_campaign_id: campaignId,
    p_amount: amount,
    p_metadata: metadata,
  });

  if (error) throw new Error(error.message);
}
