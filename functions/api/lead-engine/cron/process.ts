import type { Env } from '../../../_shared/supabase';
import {
  getAicre8ApiKey,
  getAicre8ApiUrl,
  getApifyToken,
  getEmailFrom,
  getSupabase,
  json,
  error,
} from '../../../_shared/supabase';
import { getRun, getDataset, type ApifyPlace } from '../../../_shared/apify';
import { buildSite } from '../../../_shared/aicre8';
import { sendEmail, renderOutreachEmail } from '../../../_shared/email';
import { refundReservedCredits } from '../../../_shared/credits';

const BATCH_SIZE = 3; // leads processed per invocation per status

interface LeadWithCampaign {
  id: string;
  campaign_id: string;
  business_name: string;
  email: string;
  site_url: string;
  email_template?: string | null;
}

// POST /api/lead-engine/cron/process
// Header: x-cron-secret: <CRON_SECRET>
// Call this every 2 min from GitHub Actions, cron-job.org, or a separate CF Worker.
export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  if (request.method !== 'POST') return error('Method not allowed', 405);

  const secret = request.headers.get('x-cron-secret');
  if (secret !== env.CRON_SECRET) return error('Unauthorized', 401);

  // stage=scrape -> only pull Apify results into leads; skip site builds + outreach
  // emails (so leads/opportunities populate without firing cold outreach).
  const scrapeOnly = new URL(request.url).searchParams.get('stage') === 'scrape';

  let supabase: ReturnType<typeof getSupabase>;

  try {
    supabase = getSupabase(env);
  } catch (e) {
    return error((e as Error).message, 500);
  }
  const summary = {
    scrapesChecked: 0,
    leadsInserted: 0,
    sitesBuilt: 0,
    emailsSent: 0,
    errors: [] as string[],
  };

  // 1. For each running campaign with an Apify run pending, check status
  const { data: runningCampaigns } = await supabase
    .from('lead_campaigns')
    .select('*')
    .eq('status', 'running');

  for (const campaign of runningCampaigns || []) {
    const stats = campaign.stats || {};
    const runId = stats.apifyRunId;
    if (!runId || stats.scraped > 0) continue; // already scraped

    summary.scrapesChecked++;
    try {
      const apifyToken = getApifyToken(env);
      const run = await getRun(apifyToken, runId);
      if (run.status === 'FAILED' || run.status === 'ABORTED' || run.status === 'TIMED-OUT') {
        await supabase
          .from('lead_campaigns')
          .update({ status: 'failed', stats: { ...stats, apifyStatus: run.status } })
          .eq('id', campaign.id);
        if (campaign.user_id && campaign.credit_cost && campaign.credit_status === 'reserved') {
          await refundReservedCredits(supabase, campaign.user_id, campaign.id, campaign.credit_cost, {
            reason: 'apify_run_failed',
            apifyStatus: run.status,
          }).catch((e) => summary.errors.push(`campaign ${campaign.id} credit refund: ${(e as Error).message}`));
        }
        summary.errors.push(`campaign ${campaign.id}: Apify run ${run.status}`);
        continue;
      }

      if (run.status !== 'SUCCEEDED') continue; // still running, check next cron

      const places = await getDataset(apifyToken, run.defaultDatasetId);
      // Only keep businesses we can actually contact — must have a phone number.
      const reachable = places.filter((p) => p.phone && p.phone.trim() !== '');
      const noWebsite = reachable.filter((p) => !p.website || p.website.trim() === '');
      const qualifyingPlaces = (noWebsite.length > 0 ? noWebsite : reachable)
        .slice(0, campaign.lead_count);

      const leadRows = qualifyingPlaces.map((p: ApifyPlace) => ({
        campaign_id: campaign.id,
        business_name: p.title,
        phone: p.phone,
        email: (p.emails && p.emails[0]) || null,
        website: p.website || null,
        address: p.address,
        place_id: p.placeId,
        rating: p.totalScore,
        reviews_count: p.reviewsCount,
        reviews: p.reviews || [],
        photos: p.imageUrls || [],
        hours: p.openingHours || [],
        status: 'added_to_crm' as const, // skip scraping→building for now; AICre8 build next cycle
      }));

      if (leadRows.length === 0) {
        if (campaign.user_id && campaign.credit_cost && campaign.credit_status === 'reserved') {
          await refundReservedCredits(supabase, campaign.user_id, campaign.id, campaign.credit_cost, {
            reason: 'no_qualifying_leads',
          }).catch((e) => summary.errors.push(`campaign ${campaign.id} credit refund: ${(e as Error).message}`));
        }
        await supabase
          .from('lead_campaigns')
          .update({ status: 'complete', stats: { ...stats, scraped: 0 } })
          .eq('id', campaign.id);
        continue;
      }

      await supabase.from('lead_engine_leads').insert(leadRows);
      await supabase
        .from('lead_campaigns')
        .update({
          stats: { ...stats, scraped: leadRows.length, addedToCrm: leadRows.length },
        })
        .eq('id', campaign.id);

      summary.leadsInserted += leadRows.length;
    } catch (e) {
      summary.errors.push(`campaign ${campaign.id}: ${(e as Error).message}`);
    }
  }

  if (!scrapeOnly) {
  // 2. Build sites for leads that need one (status = added_to_crm, no site_url yet)
  const { data: needSite } = await supabase
    .from('lead_engine_leads')
    .select('*')
    .eq('status', 'added_to_crm')
    .is('site_url', null)
    .limit(BATCH_SIZE);

  for (const lead of needSite || []) {
    try {
      await supabase.from('lead_engine_leads').update({ status: 'building' }).eq('id', lead.id);

      const result = await buildSite(getAicre8ApiKey(env), getAicre8ApiUrl(env), {
        businessName: lead.business_name,
        phone: lead.phone,
        email: lead.email,
        address: lead.address,
        rating: lead.rating,
        reviews: lead.reviews,
        photos: lead.photos,
        hours: lead.hours,
      });

      await supabase
        .from('lead_engine_leads')
        .update({
          status: 'added_to_crm', // site built, ready for email
          site_url: result.siteUrl,
          aicre8_project_id: result.projectId,
        })
        .eq('id', lead.id);

      await incrementCampaignStat(supabase, lead.campaign_id, 'sitesBuilt');
      summary.sitesBuilt++;
    } catch (e) {
      await supabase
        .from('lead_engine_leads')
        .update({ status: 'failed', error_message: (e as Error).message })
        .eq('id', lead.id);
      summary.errors.push(`lead ${lead.id} build: ${(e as Error).message}`);
    }
  }

  // 3. Send emails for leads with site_url + email but no email_sent_at
  const { data: needEmail } = await supabase
    .from('lead_engine_leads')
    .select('*')
    .eq('status', 'added_to_crm')
    .not('site_url', 'is', null)
    .not('email', 'is', null)
    .is('email_sent_at', null)
    .limit(BATCH_SIZE);

  const emailCampaignIds = Array.from(new Set((needEmail || []).map((lead) => lead.campaign_id)));
  const campaignTemplates = new Map<string, string>();
  if (emailCampaignIds.length > 0) {
    const { data: emailCampaigns, error: emailCampaignsErr } = await supabase
      .from('lead_campaigns')
      .select('id, email_template')
      .in('id', emailCampaignIds);

    if (emailCampaignsErr) {
      summary.errors.push(`email campaign lookup: ${emailCampaignsErr.message}`);
    } else {
      for (const campaign of emailCampaigns || []) {
        campaignTemplates.set(campaign.id, campaign.email_template || '');
      }
    }
  }

  for (const lead of needEmail || []) {
    try {
      const leadWithCampaign = lead as LeadWithCampaign;
      const template = campaignTemplates.get(leadWithCampaign.campaign_id) || '';
      const { subject, html } = renderOutreachEmail({
        businessName: leadWithCampaign.business_name,
        siteUrl: leadWithCampaign.site_url,
        template,
      });

      await sendEmail(env.RESEND_API_KEY, {
        to: leadWithCampaign.email,
        from: getEmailFrom(env),
        subject,
        html,
      });

      await supabase
        .from('lead_engine_leads')
        .update({ status: 'email_sent', email_sent_at: new Date().toISOString() })
        .eq('id', leadWithCampaign.id);

      await incrementCampaignStat(supabase, leadWithCampaign.campaign_id, 'emailsSent');
      summary.emailsSent++;
    } catch (e) {
      summary.errors.push(`lead ${lead.id} email: ${(e as Error).message}`);
    }
  }

  } // end build + email stages (skipped when stage=scrape)

  // 4. Mark campaigns complete when all leads are in final state
  const { data: maybeComplete } = await supabase
    .from('lead_campaigns')
    .select('id, lead_count, stats, user_id, credit_cost, credit_status')
    .eq('status', 'running');

  for (const camp of maybeComplete || []) {
    if (!camp.stats?.scraped) continue;

    const { data: leads } = await supabase
      .from('lead_engine_leads')
      .select('status, site_url, email')
      .eq('campaign_id', camp.id);

    const hasUnfinishedLead = (leads || []).some((lead) => {
      if (lead.status === 'email_sent' || lead.status === 'failed') return false;
      if (lead.status === 'added_to_crm' && lead.site_url && !lead.email) return false;
      return true;
    });

    if (!hasUnfinishedLead) {
      if (camp.user_id && camp.credit_cost && camp.credit_status === 'reserved') {
        const { error: spendErr } = await supabase.rpc('spend_reserved_grow_credits', {
          p_user_id: camp.user_id,
          p_campaign_id: camp.id,
          p_amount: camp.credit_cost,
          p_metadata: { reason: 'campaign_complete' },
        });
        if (spendErr) summary.errors.push(`campaign ${camp.id} credit spend: ${spendErr.message}`);
      }
      await supabase.from('lead_campaigns').update({ status: 'complete' }).eq('id', camp.id);
    }
  }

  return json(summary);
};

async function incrementCampaignStat(
  supabase: ReturnType<typeof getSupabase>,
  campaignId: string,
  key: 'sitesBuilt' | 'emailsSent',
) {
  const { data: campaign } = await supabase
    .from('lead_campaigns')
    .select('stats')
    .eq('id', campaignId)
    .single();

  const stats = campaign?.stats || {};
  await supabase
    .from('lead_campaigns')
    .update({ stats: { ...stats, [key]: (stats[key] || 0) + 1 } })
    .eq('id', campaignId);
}
