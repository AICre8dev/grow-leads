import type { Env } from '../../../_shared/supabase';
import { getSupabase, json, error } from '../../../_shared/supabase';
import { startPlacesScrape } from '../../../_shared/apify';

interface CreateBody {
  niche: string;
  city: string;
  leadCount: number;
  emailTemplate: string;
}

// GET /api/lead-engine/campaigns — list campaigns for current user
// POST /api/lead-engine/campaigns — create new campaign + kick off Apify scrape
export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const supabase = getSupabase(env);

  if (request.method === 'GET') {
    const { data, error: dbErr } = await supabase
      .from('lead_campaigns')
      .select('*, leads:lead_engine_leads(id, status)')
      .order('created_at', { ascending: false });
    if (dbErr) return error(dbErr.message, 500);
    return json({ campaigns: data });
  }

  if (request.method === 'POST') {
    let body: CreateBody;
    try {
      body = await request.json();
    } catch {
      return error('Invalid JSON body');
    }

    if (!body.niche || !body.city) return error('niche and city required');
    const leadCount = Math.min(Math.max(body.leadCount || 10, 1), 50);

    // Kick off Apify run — scrape more than needed (many will have websites and get filtered)
    const maxResults = leadCount * 3;
    let apifyRunId: string;
    try {
      const run = await startPlacesScrape(env.APIFY_TOKEN, {
        niche: body.niche,
        city: body.city,
        maxResults,
      });
      apifyRunId = run.id;
    } catch (e) {
      return error(`Apify start failed: ${(e as Error).message}`, 502);
    }

    const { data, error: insertErr } = await supabase
      .from('lead_campaigns')
      .insert({
        niche: body.niche,
        city: body.city,
        lead_count: leadCount,
        email_template: body.emailTemplate || defaultEmailTemplate(),
        status: 'running',
        stats: { scraped: 0, sitesBuilt: 0, addedToCrm: 0, emailsSent: 0, apifyRunId },
      })
      .select()
      .single();

    if (insertErr) return error(insertErr.message, 500);
    return json({ campaign: data }, 201);
  }

  return error('Method not allowed', 405);
};

function defaultEmailTemplate(): string {
  return `Hi {{business_name}},

I built you a free preview website using your public Google info — reviews, phone, address, hours. No catch, just wanted to show what's possible.

Take a look: {{preview_url}}

If you like it, we can make it yours (custom domain, your photos, contact forms) for £297/mo all-in — includes an AI receptionist that answers calls 24/7.

If not, no worries. Reply "remove" and I'll take you off the list.

Thanks,
Nina`;
}
