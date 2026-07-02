import type { Env } from '../../../_shared/supabase';
import { getSupabase, json, error, getApifyToken, getAicre8ApiUrl } from '../../../_shared/supabase';
import { getRequestUserId } from '../../../_shared/auth';
import { getRun, getTweetDataset, groupByAuthor, selectInvestorCandidates, type SourcedAuthor } from '../../../_shared/apify';

// POST /api/grow/research/drain
// For the caller's in-flight X sourcing runs: check the Apify run, and once it
// finishes, enrich the scraped authors via AICre8 (LLM classify + score + hook)
// and insert the qualified investors as research leads. Safe to call repeatedly
// (browser nudge + cron) — finished runs flip to 'done' and won't reprocess.

const MAX_AUTHORS = 15; // matches the enrich endpoint's per-call cap
const MIN_FIT = 40; // drop weak / non-investor matches

interface EnrichedInvestor {
  handle: string;
  url: string;
  isInvestor: boolean;
  name: string;
  firm: string;
  role: string;
  thesis: string;
  stage: string;
  checkSize: string;
  fitScore: number;
  signal: string;
  hook: string;
}

function priorityFor(score: number): 'high' | 'medium' | 'low' {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
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

  const { data: runs } = await supabase
    .from('grow_research_runs')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['sourcing', 'draining'])
    .order('created_at', { ascending: false })
    .limit(5);

  if (!runs || runs.length === 0) return json({ runs: [], inserted: 0 });

  const apifyToken = getApifyToken(env);
  const internalKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const aicre8Url = getAicre8ApiUrl(env);

  // Existing X contacts so we don't insert the same investor twice.
  const { data: existing } = await supabase
    .from('grow_research_leads')
    .select('contact')
    .eq('user_id', userId)
    .eq('source', 'twitter');
  const seen = new Set((existing || []).map((r) => (r.contact || '').toLowerCase()));

  const summary: Array<{ runId: string; status: string; found: number; qualified: number }> = [];
  let insertedTotal = 0;

  for (const run of runs) {
    let apRun;
    try {
      apRun = await getRun(apifyToken, run.apify_run_id);
    } catch {
      continue; // transient — try again on the next nudge
    }

    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(apRun.status)) {
      await supabase.from('grow_research_runs').update({ status: 'failed', error: `apify ${apRun.status}` }).eq('id', run.id);
      summary.push({ runId: run.id, status: 'failed', found: 0, qualified: 0 });
      continue;
    }

    if (apRun.status !== 'SUCCEEDED') {
      summary.push({ runId: run.id, status: 'sourcing', found: 0, qualified: 0 });
      continue; // still running
    }

    await supabase.from('grow_research_runs').update({ status: 'draining' }).eq('id', run.id);

    let authors: SourcedAuthor[] = [];
    try {
      const raw = await getTweetDataset(apifyToken, run.apify_dataset_id || apRun.defaultDatasetId);
      authors = selectInvestorCandidates(groupByAuthor(raw), MAX_AUTHORS);
    } catch (e) {
      await supabase.from('grow_research_runs').update({ status: 'failed', error: `dataset: ${(e as Error).message}` }).eq('id', run.id);
      summary.push({ runId: run.id, status: 'failed', found: 0, qualified: 0 });
      continue;
    }

    let investors: EnrichedInvestor[] = [];
    try {
      const res = await fetch(`${aicre8Url}/api/grow/investor-enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-key': internalKey },
        body: JSON.stringify({ brief: run.brief, authors }),
      });
      if (res.ok) {
        const data = (await res.json()) as { investors?: EnrichedInvestor[] };
        investors = data.investors || [];
      }
    } catch {
      /* enrich unavailable — leave run to retry next nudge */
    }

    if (investors.length === 0) {
      // Nothing came back (still enriching or none qualified). Mark done to
      // avoid re-scraping; a fresh brief starts a new run.
      await supabase.from('grow_research_runs').update({ status: 'done', found: authors.length, qualified: 0 }).eq('id', run.id);
      summary.push({ runId: run.id, status: 'done', found: authors.length, qualified: 0 });
      continue;
    }

    const byHandle = new Map(authors.map((a) => [a.handle.toLowerCase(), a]));
    const rows = investors
      .filter((inv) => inv.isInvestor && inv.fitScore >= MIN_FIT && inv.handle)
      .map((inv) => {
        const contact = `@${inv.handle}`;
        if (seen.has(contact.toLowerCase())) return null;
        seen.add(contact.toLowerCase());
        const author = byHandle.get(inv.handle.toLowerCase());
        return {
          user_id: userId,
          name: inv.name || inv.handle,
          company: inv.firm || 'Angel / independent',
          role: inv.role || 'Investor',
          intent: 'investor',
          source: 'twitter',
          source_label: 'X signal',
          location: author?.location || 'Global',
          fit_score: inv.fitScore,
          status: inv.hook ? 'hook_ready' : 'qualified',
          priority: priorityFor(inv.fitScore),
          signal: inv.signal,
          next_action: 'DM on X',
          hook: inv.hook,
          contact,
          value: inv.checkSize || inv.stage || '',
          metadata: {
            handle: inv.handle,
            url: inv.url,
            thesis: inv.thesis,
            stage: inv.stage,
            checkSize: inv.checkSize,
            followers: author?.followers ?? 0,
            verified: author?.verified ?? false,
          },
        };
      })
      .filter(Boolean);

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('grow_research_leads').insert(rows as object[]);
      if (!insErr) insertedTotal += rows.length;
    }

    await supabase
      .from('grow_research_runs')
      .update({ status: 'done', found: authors.length, qualified: rows.length })
      .eq('id', run.id);
    summary.push({ runId: run.id, status: 'done', found: authors.length, qualified: rows.length });
  }

  return json({ runs: summary, inserted: insertedTotal });
};
