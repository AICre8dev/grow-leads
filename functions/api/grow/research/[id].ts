import type { Env } from '../../../_shared/supabase';
import { getSupabase, json, error } from '../../../_shared/supabase';
import { getRequestUserId } from '../../../_shared/auth';

const statuses = ['found', 'qualified', 'hook_ready', 'contacted', 'clicked', 'replied', 'booked', 'blocked'] as const;
const priorities = ['high', 'medium', 'low'] as const;

type ResearchStatus = typeof statuses[number];
type ResearchPriority = typeof priorities[number];

interface UpdateResearchLeadBody {
  fitScore?: number;
  status?: ResearchStatus;
  priority?: ResearchPriority;
  signal?: string;
  nextAction?: string;
  hook?: string;
  contact?: string;
  value?: string;
}

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  if (request.method !== 'PATCH') return error('Method not allowed', 405);

  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase(env);
  } catch (e) {
    return error((e as Error).message, 500);
  }

  const userId = await getRequestUserId(request, env, supabase);
  if (!userId) return error('Unauthorized', 401);

  const id = String(params.id || '');
  if (!id) return error('Research lead id required');

  let body: UpdateResearchLeadBody;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }

  const patch: Record<string, unknown> = {};

  if (isOneOf(body.status, statuses)) patch.status = body.status;
  if (isOneOf(body.priority, priorities)) patch.priority = body.priority;
  if (typeof body.fitScore === 'number') patch.fit_score = clampInt(body.fitScore, 0, 100);
  if (typeof body.signal === 'string') patch.signal = body.signal.trim().slice(0, 1_500);
  if (typeof body.nextAction === 'string') patch.next_action = body.nextAction.trim().slice(0, 500);
  if (typeof body.hook === 'string') patch.hook = body.hook.trim().slice(0, 1_500);
  if (typeof body.contact === 'string') patch.contact = body.contact.trim().slice(0, 240);
  if (typeof body.value === 'string') patch.value = body.value.trim().slice(0, 160);

  if (Object.keys(patch).length === 0) return error('No valid fields to update');

  const { data, error: updateErr } = await supabase
    .from('grow_research_leads')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (updateErr) return error(updateErr.message, 500);
  return json({ researchLead: data });
};

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function isOneOf<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}
