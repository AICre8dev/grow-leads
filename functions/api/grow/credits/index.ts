import type { Env } from '../../../_shared/supabase';
import { getSupabase, json, error } from '../../../_shared/supabase';
import { getRequestUserId } from '../../../_shared/auth';
import { getCreditSummary } from '../../../_shared/credits';
import { GROW_CREDIT_PACKS } from '../../../_shared/growPlans';

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

  try {
    const credits = await getCreditSummary(supabase, userId);
    return json({ credits, packs: GROW_CREDIT_PACKS });
  } catch (e) {
    return error((e as Error).message, 500);
  }
};
