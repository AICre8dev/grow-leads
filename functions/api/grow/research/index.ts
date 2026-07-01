import type { Env } from '../../../_shared/supabase';
import { getSupabase, json, error } from '../../../_shared/supabase';
import { getRequestUserId } from '../../../_shared/auth';

const intents = ['investor', 'startup_customer', 'local_business', 'launch_listing', 'agency_partner'] as const;
const sources = ['linkedin', 'crunchbase', 'product_hunt', 'launch_directory', 'google_maps', 'github', 'website', 'csv', 'twitter'] as const;
const statuses = ['found', 'qualified', 'hook_ready', 'contacted', 'clicked', 'replied', 'booked', 'blocked'] as const;
const priorities = ['high', 'medium', 'low'] as const;

type ResearchIntent = typeof intents[number];
type ResearchSource = typeof sources[number];
type ResearchStatus = typeof statuses[number];
type ResearchPriority = typeof priorities[number];

interface CreateResearchLeadBody {
  name?: string;
  company?: string;
  role?: string;
  intent?: ResearchIntent;
  source?: ResearchSource;
  sourceLabel?: string;
  location?: string;
  fitScore?: number;
  status?: ResearchStatus;
  priority?: ResearchPriority;
  signal?: string;
  nextAction?: string;
  hook?: string;
  contact?: string;
  value?: string;
  metadata?: Record<string, unknown>;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  let supabase: ReturnType<typeof getSupabase>;

  try {
    supabase = getSupabase(env);
  } catch (e) {
    return error((e as Error).message, 500);
  }

  const userId = await getRequestUserId(request, env, supabase);
  if (!userId) return error('Unauthorized', 401);

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const intent = url.searchParams.get('intent');
    const status = url.searchParams.get('status');

    let query = supabase
      .from('grow_research_leads')
      .select('*')
      .eq('user_id', userId)
      .order('fit_score', { ascending: false })
      .order('updated_at', { ascending: false });

    if (isOneOf(intent, intents)) query = query.eq('intent', intent);
    if (isOneOf(status, statuses)) query = query.eq('status', status);

    const { data, error: dbErr } = await query;
    if (dbErr) return error(dbErr.message, 500);

    return json({ researchLeads: data || [] });
  }

  if (request.method === 'POST') {
    let body: CreateResearchLeadBody;
    try {
      body = await request.json();
    } catch {
      return error('Invalid JSON body');
    }

    const name = cleanText(body.name, 140);
    if (!name) return error('name required');

    const payload = {
      user_id: userId,
      name,
      company: cleanText(body.company, 140) || 'Research target',
      role: cleanText(body.role, 120) || 'Target contact',
      intent: oneOf(body.intent, intents, 'startup_customer'),
      source: oneOf(body.source, sources, 'website'),
      source_label: cleanText(body.sourceLabel, 120) || 'Manual research',
      location: cleanText(body.location, 120) || 'Global',
      fit_score: clampInt(body.fitScore, 0, 100, 70),
      status: oneOf(body.status, statuses, 'found'),
      priority: oneOf(body.priority, priorities, 'medium'),
      signal: cleanText(body.signal, 1_500),
      next_action: cleanText(body.nextAction, 500),
      hook: cleanText(body.hook, 1_500),
      contact: cleanText(body.contact, 240) || 'To be enriched',
      value: cleanText(body.value, 160),
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
    };

    const { data, error: insertErr } = await supabase
      .from('grow_research_leads')
      .insert(payload)
      .select()
      .single();

    if (insertErr) return error(insertErr.message, 500);
    return json({ researchLead: data }, 201);
  }

  return error('Method not allowed', 405);
};

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === 'number' ? Math.round(value) : Number.NaN;
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function isOneOf<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

function oneOf<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  return isOneOf(value, allowed) ? value : fallback;
}
