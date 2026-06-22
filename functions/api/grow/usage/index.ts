import type { Env } from '../../../_shared/supabase';
import { getSupabase, json, error } from '../../../_shared/supabase';
import { getRequestUserId } from '../../../_shared/auth';
import { GROW_CREDIT_PACKS, GROW_PLANS, type GrowPlanCode } from '../../../_shared/growPlans';
import { getGrowUsage } from '../../../_shared/usage';

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'GET') return error('Method not allowed', 405);

  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase(env);
  } catch (e) {
    return error((e as Error).message, 500);
  }

  const userId = await getRequestUserId(request, env, supabase);
  if (!userId) return error('Unauthorized', 401);

  const url = new URL(request.url);
  const plan = (url.searchParams.get('plan') || 'starter') as GrowPlanCode;

  try {
    const usage = await getGrowUsage(supabase, userId, plan);
    const { data: events } = await supabase
      .from('grow_usage_events')
      .select('id, client_id, event_type, credits_delta, voice_minutes_delta, provider_spend_cents, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    const { data: purchases } = await supabase
      .from('grow_credit_purchases')
      .select('id, pack, credits, amount_cents, status, created_at, completed_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return json({
      usage,
      plans: GROW_PLANS,
      packs: GROW_CREDIT_PACKS,
      events: events || [],
      purchases: purchases || [],
    });
  } catch (e) {
    return error((e as Error).message, 500);
  }
};

