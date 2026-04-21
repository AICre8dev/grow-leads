import type { Env } from '../../../_shared/supabase';
import { getSupabase, json, error } from '../../../_shared/supabase';

// GET /api/lead-engine/campaigns/:id — return campaign + all leads
export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env, params } = ctx;
  if (request.method !== 'GET') return error('Method not allowed', 405);

  const id = params.id as string;
  const supabase = getSupabase(env);

  const { data: campaign, error: campErr } = await supabase
    .from('lead_campaigns')
    .select('*')
    .eq('id', id)
    .single();
  if (campErr) return error(campErr.message, 404);

  const { data: leads, error: leadsErr } = await supabase
    .from('lead_engine_leads')
    .select('*')
    .eq('campaign_id', id)
    .order('created_at', { ascending: true });
  if (leadsErr) return error(leadsErr.message, 500);

  return json({ campaign, leads });
};
