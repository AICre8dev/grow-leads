import type { Env } from '../../../_shared/supabase';
import { getSupabase, json, error } from '../../../_shared/supabase';
import { getRequestUserId } from '../../../_shared/auth';
import { findGrowCreditPack } from '../../../_shared/growPlans';
import { createStripeCheckoutSession } from '../../../_shared/stripe';

interface CheckoutBody {
  packId: string;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return error('Method not allowed', 405);

  let body: CheckoutBody;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }

  const pack = findGrowCreditPack(body.packId);
  if (!pack) return error('Unknown credit pack');

  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase(env);
  } catch (e) {
    return error((e as Error).message, 500);
  }

  const userId = await getRequestUserId(request, env, supabase);
  if (!userId) return error('Unauthorized', 401);

  const origin = new URL(request.url).origin;

  try {
    const session = await createStripeCheckoutSession(env, {
      pack,
      userId,
      successUrl: `${origin}/?checkout=success`,
      cancelUrl: `${origin}/?checkout=cancelled`,
    });

    const { error: insertErr } = await supabase
      .from('grow_stripe_checkout_sessions')
      .insert({
        user_id: userId,
        stripe_session_id: session.id,
        stripe_price_id: pack.id,
        credits: pack.credits,
      });

    if (insertErr) return error(insertErr.message, 500);

    await supabase.from('grow_credit_purchases').insert({
      user_id: userId,
      stripe_session_id: session.id,
      pack: pack.id,
      credits: pack.credits,
      amount_cents: pack.amountCents,
      status: 'pending',
    });

    return json({ url: session.url, sessionId: session.id });
  } catch (e) {
    return error((e as Error).message, 502);
  }
};
