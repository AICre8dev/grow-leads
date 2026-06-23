import type { Env } from '../../_shared/supabase';
import { error } from '../../_shared/supabase';

// POST /api/lead-engine/process-now
// Browser-callable nudge that drains finished Apify scrapes into leads.
// Scrape-only (no site builds, no outreach emails), so it's safe to expose
// without the cron secret — it adds the secret server-side and calls the real
// processor. This is what makes new searches show results without a scheduler.
export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  if (request.method !== 'POST') return error('Method not allowed', 405);

  const origin = new URL(request.url).origin;
  const res = await fetch(`${origin}/api/lead-engine/cron/process?stage=scrape`, {
    method: 'POST',
    headers: { 'x-cron-secret': env.CRON_SECRET },
  });

  return new Response(await res.text(), {
    status: res.status,
    headers: { 'content-type': 'application/json' },
  });
};
