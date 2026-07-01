import type { Env } from '../../../_shared/supabase';
import { getSupabase, json, error, getApifyToken } from '../../../_shared/supabase';
import { getRequestUserId } from '../../../_shared/auth';
import { startTweetScrape } from '../../../_shared/apify';

// POST /api/grow/research/source-investors  body: { brief }
// Kicks off an async X/Twitter scrape for accounts showing active-investor
// signals that match the fundraise brief, and records a run row the drain step
// (see ./drain) later processes into ranked investor leads.

const MAX_TWEETS = 120; // total items pulled across all queries — tune for cost

const STOPWORDS = new Set([
  'find', 'investors', 'investor', 'for', 'who', 'back', 'backs', 'backing', 'and', 'or',
  'the', 'a', 'an', 'to', 'of', 'in', 'on', 'with', 'that', 'this', 'my', 'our', 'we',
  'need', 'looking', 'want', 'get', 'raise', 'raising', 'round', 'funding', 'capital',
  'startup', 'startups', 'company', 'app', 'platform', 'business', 'like', 'such', 'as',
]);

// Pull a handful of distinctive domain terms out of the brief so the X search
// targets the right thesis (e.g. "AI", "no-code", "SaaS").
function extractDomainTerms(brief: string): string[] {
  const phrases = brief.match(/"[^"]+"|[a-z0-9][a-z0-9-]{2,}/gi) || [];
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const p of phrases) {
    const clean = p.replace(/^"|"$/g, '').trim().toLowerCase();
    if (clean.length < 3 || STOPWORDS.has(clean) || seen.has(clean)) continue;
    seen.add(clean);
    terms.push(/\s/.test(clean) ? `"${clean}"` : clean);
    if (terms.length >= 6) break;
  }
  return terms.length >= 2 ? terms : ['AI', 'SaaS', 'startups', 'founders'];
}

function buildQueries(brief: string): string[] {
  const domain = `(${extractDomainTerms(brief).join(' OR ')})`;
  return [
    `("angel investing" OR "writing checks" OR "deploying capital" OR "open to pitches") ${domain} -is:retweet`,
    `("just invested" OR "backing founders" OR "send me your deck" OR "i invest in") ${domain} -is:retweet`,
    `(angel OR "seed investor" OR "pre-seed" OR "vc") ${domain} min_faves:2 -is:retweet`,
  ];
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return error('Method not allowed', 405);

  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase(env);
  } catch (e) {
    return error((e as Error).message, 500);
  }

  const userId = await getRequestUserId(request, env, supabase);
  if (!userId) return error('Unauthorized', 401);

  let body: { brief?: string };
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }
  const brief = String(body.brief || '').trim().slice(0, 2000);
  if (!brief) return error('brief required');

  let apifyToken: string;
  try {
    apifyToken = getApifyToken(env);
  } catch (e) {
    return error((e as Error).message, 500);
  }

  let run;
  try {
    run = await startTweetScrape(apifyToken, {
      searchTerms: buildQueries(brief),
      maxItems: MAX_TWEETS,
      actor: (env as any).APIFY_TWITTER_ACTOR,
    });
  } catch (e) {
    return error(`X sourcing failed to start: ${(e as Error).message}`, 502);
  }

  const { data, error: insertErr } = await supabase
    .from('grow_research_runs')
    .insert({
      user_id: userId,
      kind: 'investor_x',
      brief,
      apify_run_id: run.id,
      apify_dataset_id: run.defaultDatasetId,
      status: 'sourcing',
    })
    .select()
    .single();

  if (insertErr) return error(insertErr.message, 500);

  return json({ runId: data.id, apifyRunId: run.id, status: 'sourcing' }, 201);
};
