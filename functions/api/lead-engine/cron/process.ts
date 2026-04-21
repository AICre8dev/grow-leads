import type { Env } from '../../../_shared/supabase';
import { getSupabase, json, error } from '../../../_shared/supabase';
import { getRun, getDataset, type ApifyPlace } from '../../../_shared/apify';
import { buildSite } from '../../../_shared/aicre8';
import { sendEmail, renderOutreachEmail } from '../../../_shared/email';

const BATCH_SIZE = 3; // leads processed per invocation per status

// POST /api/lead-engine/cron/process
// Header: x-cron-secret: <CRON_SECRET>
// Call this every 2 min from GitHub Actions, cron-job.org, or a separate CF Worker.
export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  if (request.method !== 'POST') return error('Method not allowed', 405);

  const secret = request.headers.get('x-cron-secret');
  if (secret !== env.CRON_SECRET) return error('Unauthorized', 401);

  const supabase = getSupabase(env);
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
      const run = await getRun(env.APIFY_TOKEN, runId);
      if (run.status !== 'SUCCEEDED') continue; // still running, check next cron

      const places = await getDataset(env.APIFY_TOKEN, run.defaultDatasetId);
      const noWebsite = places
        .filter((p) => !p.website || p.website.trim() === '')
        .slice(0, campaign.lead_count);

      const leadRows = noWebsite.map((p: ApifyPlace) => ({
        campaign_id: campaign.id,
        business_name: p.title,
        phone: p.phone,
        email: (p.emails && p.emails[0]) || null,
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

      const result = await buildSite(env.AICRE8_API_KEY, env.AICRE8_API_URL, {
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
    .select('*, lead_campaigns(email_template, niche)')
    .eq('status', 'added_to_crm')
    .not('site_url', 'is', null)
    .not('email', 'is', null)
    .is('email_sent_at', null)
    .limit(BATCH_SIZE);

  for (const lead of needEmail || []) {
    try {
      const template = (lead as any).lead_campaigns?.email_template || '';
      const { subject, html } = renderOutreachEmail({
        businessName: lead.business_name,
        siteUrl: lead.site_url,
        template,
      });

      await sendEmail(env.RESEND_API_KEY, {
        to: lead.email,
        from: env.EMAIL_FROM,
        subject,
        html,
      });

      await supabase
        .from('lead_engine_leads')
        .update({ status: 'email_sent', email_sent_at: new Date().toISOString() })
        .eq('id', lead.id);

      summary.emailsSent++;
    } catch (e) {
      summary.errors.push(`lead ${lead.id} email: ${(e as Error).message}`);
    }
  }

  // 4. Mark campaigns complete when all leads are in final state
  const { data: maybeComplete } = await supabase
    .from('lead_campaigns')
    .select('id, lead_count')
    .eq('status', 'running');

  for (const camp of maybeComplete || []) {
    const { count: pendingCount } = await supabase
      .from('lead_engine_leads')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', camp.id)
      .not('status', 'in', '(email_sent,failed)');

    if ((pendingCount || 0) === 0) {
      await supabase.from('lead_campaigns').update({ status: 'complete' }).eq('id', camp.id);
    }
  }

  return json(summary);
};
