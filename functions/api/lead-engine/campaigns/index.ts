import type { Env } from '../../../_shared/supabase';
import { getApifyToken, getSupabase, json, error } from '../../../_shared/supabase';
import { startPlacesScrape } from '../../../_shared/apify';
import { getRequestUserId } from '../../../_shared/auth';
import { consumeGrowUsage, getGrowUsage } from '../../../_shared/usage';

interface CreateBody {
  clientName?: string;
  niche: string;
  city: string;
  leadCount: number;
  emailTemplate: string;
}

// GET /api/lead-engine/campaigns — list campaigns for current user
// POST /api/lead-engine/campaigns — create new campaign + kick off Apify scrape
export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  let supabase: ReturnType<typeof getSupabase>;

  try {
    supabase = getSupabase(env);
  } catch (e) {
    return error((e as Error).message, 500);
  }

  if (request.method === 'GET') {
    const userId = await getRequestUserId(request, env, supabase);
    if (!userId) return error('Unauthorized', 401);

    const { data: campaigns, error: dbErr } = await supabase
      .from('lead_campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (dbErr) return error(dbErr.message, 500);

    const campaignIds = (campaigns || []).map((campaign) => campaign.id);
    if (campaignIds.length === 0) return json({ campaigns: [] });

    const { data: leads, error: leadsErr } = await supabase
      .from('lead_engine_leads')
      .select('id, campaign_id, business_name, phone, email, website, address, rating, reviews_count, map_rank, status, site_url, error_message')
      .in('campaign_id', campaignIds);
    if (leadsErr) return error(leadsErr.message, 500);

    const leadsByCampaign = new Map<string, typeof leads>();
    for (const lead of leads || []) {
      const existing = leadsByCampaign.get(lead.campaign_id) || [];
      existing.push(lead);
      leadsByCampaign.set(lead.campaign_id, existing);
    }

    return json({
      campaigns: campaigns.map((campaign) => ({
        ...campaign,
        leads: leadsByCampaign.get(campaign.id) || [],
      })),
    });
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
    const userId = await getRequestUserId(request, env, supabase);
    if (!userId) return error('Unauthorized', 401);

    const { data: campaign, error: insertErr } = await supabase
      .from('lead_campaigns')
      .insert({
        user_id: userId,
        client_name: body.clientName?.trim() || null,
        niche: body.niche,
        city: body.city,
        lead_count: leadCount,
        email_template: body.emailTemplate || defaultEmailTemplate(),
        status: 'pending',
        credit_cost: leadCount,
        credit_status: 'none',
        stats: { scraped: 0, sitesBuilt: 0, addedToCrm: 0, emailsSent: 0 },
      })
      .select()
      .single();

    if (insertErr) {
      return error(insertErr.message, 500);
    }

    // Kick off Apify run — scrape more than needed (many will have websites and get filtered)
    const maxResults = leadCount * 3;
    let apifyRunId: string;
    try {
      const run = await startPlacesScrape(getApifyToken(env), {
        niche: body.niche,
        city: body.city,
        maxResults,
      });
      apifyRunId = run.id;
    } catch (e) {
      await supabase
        .from('lead_campaigns')
        .update({ status: 'failed' })
        .eq('id', campaign.id);
      return error(`Apify start failed: ${(e as Error).message}`, 502);
    }

    await consumeGrowUsage(supabase, {
      userId,
      eventType: 'lead_campaign_launched',
      quantity: leadCount,
      creditsDelta: leadCount,
      metadata: {
        campaignId: campaign.id,
        clientName: body.clientName?.trim() || null,
        niche: body.niche,
        city: body.city,
        leadsRequested: leadCount,
      },
    }).catch(() => undefined);

    const { data, error: updateErr } = await supabase
      .from('lead_campaigns')
      .update({
        status: 'running',
        stats: {
          ...(campaign.stats || {}),
          apifyRunId,
        },
      })
      .select()
      .eq('id', campaign.id)
      .single();

    if (updateErr) return error(updateErr.message, 500);
    const usage = await getGrowUsage(supabase, userId);
    return json({ campaign: data, usage }, 201);
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
