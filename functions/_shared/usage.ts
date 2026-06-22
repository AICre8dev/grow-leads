import type { getSupabase } from './supabase';
import { findGrowPlan, type GrowPlanCode } from './growPlans';

export type UsageWarningState = 'ok' | 'near_limit' | 'limit_reached' | 'spend_blocked';

export interface GrowUsageBalance {
  plan: GrowPlanCode;
  periodStart: string;
  periodEnd: string;
  credits: {
    used: number;
    remaining: number;
    total: number;
  };
  voiceMinutes: {
    used: number;
    remaining: number;
    total: number;
  };
  clients: {
    used: number;
    limit: number;
  };
  providerSpendCents: number;
  hardSpendLimitCents: number;
  warningState: UsageWarningState;
}

interface GrowUsageBalanceRow {
  plan: GrowPlanCode;
  period_start: string;
  period_end: string;
  grow_credits_total: number | string;
  grow_credits_used: number | string;
  voice_minutes_total: number | string;
  voice_minutes_used: number | string;
  client_limit: number;
  client_count: number;
  hard_spend_limit_cents: number;
  provider_spend_cents: number;
}

export interface ConsumeGrowUsageInput {
  userId: string;
  clientId?: string | null;
  eventType: string;
  quantity?: number;
  creditsDelta?: number;
  voiceMinutesDelta?: number;
  providerSpendCents?: number;
  providerTokensInput?: number | null;
  providerTokensOutput?: number | null;
  metadata?: Record<string, unknown>;
}

export async function getGrowUsage(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  plan: GrowPlanCode = 'starter',
): Promise<GrowUsageBalance> {
  const { data, error } = await supabase.rpc('ensure_grow_usage_balance', {
    p_user_id: userId,
    p_plan: plan,
  });

  if (error) throw new Error(error.message);
  return mapGrowUsageBalance(data as GrowUsageBalanceRow);
}

export async function consumeGrowUsage(
  supabase: ReturnType<typeof getSupabase>,
  input: ConsumeGrowUsageInput,
): Promise<GrowUsageBalance> {
  const { data, error } = await supabase.rpc('consume_grow_usage', {
    p_user_id: input.userId,
    p_client_id: input.clientId || null,
    p_event_type: input.eventType,
    p_quantity: input.quantity || 1,
    p_credits_delta: input.creditsDelta || 0,
    p_voice_minutes_delta: input.voiceMinutesDelta || 0,
    p_provider_spend_cents: input.providerSpendCents || 0,
    p_provider_tokens_input: input.providerTokensInput ?? null,
    p_provider_tokens_output: input.providerTokensOutput ?? null,
    p_metadata: input.metadata || {},
  });

  if (error) throw new Error(error.message);
  return mapGrowUsageBalance(data as GrowUsageBalanceRow);
}

export async function grantPurchasedGrowCredits(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  credits: number,
): Promise<GrowUsageBalance> {
  const { data, error } = await supabase.rpc('grant_purchased_grow_credits', {
    p_user_id: userId,
    p_credits: credits,
  });

  if (error) throw new Error(error.message);
  return mapGrowUsageBalance(data as GrowUsageBalanceRow);
}

function mapGrowUsageBalance(row: GrowUsageBalanceRow): GrowUsageBalance {
  const totalCredits = toNumber(row.grow_credits_total);
  const usedCredits = toNumber(row.grow_credits_used);
  const totalVoiceMinutes = toNumber(row.voice_minutes_total);
  const usedVoiceMinutes = toNumber(row.voice_minutes_used);
  const hardSpendLimitCents = row.hard_spend_limit_cents || 0;
  const providerSpendCents = row.provider_spend_cents || 0;
  const plan = findGrowPlan(row.plan);
  const warningState = getWarningState({
    usedCredits,
    totalCredits,
    usedVoiceMinutes,
    totalVoiceMinutes,
    providerSpendCents,
    hardSpendLimitCents,
  });

  return {
    plan: plan.code,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    credits: {
      used: usedCredits,
      remaining: Math.max(0, totalCredits - usedCredits),
      total: totalCredits,
    },
    voiceMinutes: {
      used: usedVoiceMinutes,
      remaining: Math.max(0, totalVoiceMinutes - usedVoiceMinutes),
      total: totalVoiceMinutes,
    },
    clients: {
      used: row.client_count || 0,
      limit: row.client_limit || plan.clientLimit,
    },
    providerSpendCents,
    hardSpendLimitCents,
    warningState,
  };
}

function getWarningState(input: {
  usedCredits: number;
  totalCredits: number;
  usedVoiceMinutes: number;
  totalVoiceMinutes: number;
  providerSpendCents: number;
  hardSpendLimitCents: number;
}): UsageWarningState {
  if (input.hardSpendLimitCents > 0 && input.providerSpendCents >= input.hardSpendLimitCents) {
    return 'spend_blocked';
  }

  const creditsRatio = ratio(input.usedCredits, input.totalCredits);
  const voiceRatio = ratio(input.usedVoiceMinutes, input.totalVoiceMinutes);
  const maxRatio = Math.max(creditsRatio, voiceRatio);

  if (maxRatio >= 1) return 'limit_reached';
  if (maxRatio >= 0.8) return 'near_limit';
  return 'ok';
}

function ratio(used: number, total: number): number {
  if (total <= 0) return 0;
  return used / total;
}

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value || 0);
}

export interface VoiceUsageInput {
  userId: string;
  provider?: string;
  providerCallId?: string;
  voiceMinutes: number;
  inputTokens: number;
  outputTokens: number;
  spendCents: number;
  metadata?: Record<string, unknown>;
}

export interface VoiceUsageLimits {
  planCode: string;
  periodStart: string;
  periodEnd: string;
  voiceMinutesLimit: number;
  voiceTokensLimit: number;
  voiceSpendCentsLimit: number;
  voiceMinutesUsed: number;
  voiceTokensUsed: number;
  voiceSpendCentsUsed: number;
  hardStopEnabled: boolean;
}

interface VoiceUsageLimitRow {
  plan_code: string;
  period_start: string;
  period_end: string;
  voice_minutes_limit: number;
  voice_tokens_limit: number;
  voice_spend_cents_limit: number;
  voice_minutes_used: number;
  voice_tokens_used: number;
  voice_spend_cents_used: number;
  hard_stop_enabled: boolean;
}

export async function consumeVoiceUsage(
  supabase: ReturnType<typeof getSupabase>,
  input: VoiceUsageInput,
): Promise<VoiceUsageLimits> {
  const { data, error } = await supabase.rpc('consume_voice_usage', {
    p_user_id: input.userId,
    p_provider: input.provider || null,
    p_provider_call_id: input.providerCallId || null,
    p_voice_minutes: input.voiceMinutes,
    p_input_tokens: input.inputTokens,
    p_output_tokens: input.outputTokens,
    p_spend_cents: input.spendCents,
    p_metadata: input.metadata || {},
  });

  if (error) throw new Error(error.message);
  return mapUsageLimits(data as VoiceUsageLimitRow);
}

function mapUsageLimits(row: VoiceUsageLimitRow): VoiceUsageLimits {
  return {
    planCode: row.plan_code,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    voiceMinutesLimit: row.voice_minutes_limit,
    voiceTokensLimit: row.voice_tokens_limit,
    voiceSpendCentsLimit: row.voice_spend_cents_limit,
    voiceMinutesUsed: row.voice_minutes_used,
    voiceTokensUsed: row.voice_tokens_used,
    voiceSpendCentsUsed: row.voice_spend_cents_used,
    hardStopEnabled: row.hard_stop_enabled,
  };
}
