import type { Env } from '../../_shared/supabase';
import { getStripeWebhookSecret, getSupabase, json, error } from '../../_shared/supabase';
import { grantCredits } from '../../_shared/credits';
import { grantPurchasedGrowCredits } from '../../_shared/usage';
import { retrieveStripeCheckoutSession, verifyStripeWebhook } from '../../_shared/stripe';

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      metadata?: Record<string, string>;
      payment_status?: string;
    };
  };
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return error('Method not allowed', 405);

  const payload = await request.text();
  let webhookSecret: string;
  try {
    webhookSecret = getStripeWebhookSecret(env);
  } catch (e) {
    return error((e as Error).message, 500);
  }

  const isVerified = await verifyStripeWebhook(
    payload,
    request.headers.get('stripe-signature'),
    webhookSecret,
  );

  if (!isVerified) return error('Invalid Stripe signature', 400);

  let event: StripeEvent;
  try {
    event = JSON.parse(payload);
  } catch {
    return error('Invalid Stripe payload');
  }

  if (event.type !== 'checkout.session.completed') {
    return json({ received: true });
  }

  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase(env);
  } catch (e) {
    return error((e as Error).message, 500);
  }

  const sessionId = event.data.object.id;

  const { data: existing, error: existingErr } = await supabase
    .from('grow_stripe_checkout_sessions')
    .select('id, user_id, credits, status')
    .eq('stripe_session_id', sessionId)
    .maybeSingle();

  if (existingErr) return error(existingErr.message, 500);
  if (!existing) return error('Unknown checkout session', 404);
  if (existing.status !== 'pending') return json({ received: true, duplicate: true });

  const { data: locked, error: lockErr } = await supabase
    .from('grow_stripe_checkout_sessions')
    .update({ status: 'processing' })
    .eq('id', existing.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (lockErr) return error(lockErr.message, 500);
  if (!locked) return json({ received: true, duplicate: true });

  try {
    const session = await retrieveStripeCheckoutSession(env, sessionId);
    if (session.payment_status !== 'paid') {
      await supabase
        .from('grow_stripe_checkout_sessions')
        .update({ status: 'failed' })
        .eq('id', existing.id);
      return error('Checkout session is not paid', 400);
    }

    const creditEventId = await grantCredits(supabase, existing.user_id, existing.credits, {
      stripeEventId: event.id,
      stripeSessionId: sessionId,
      source: 'stripe_checkout',
    });
    await grantPurchasedGrowCredits(supabase, existing.user_id, existing.credits);

    const { error: updateErr } = await supabase
      .from('grow_stripe_checkout_sessions')
      .update({
        status: 'completed',
        credit_event_id: creditEventId,
        completed_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateErr) return error(updateErr.message, 500);

    await supabase
      .from('grow_credit_purchases')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('stripe_session_id', sessionId);

    return json({ received: true });
  } catch (e) {
    await supabase
      .from('grow_stripe_checkout_sessions')
      .update({ status: 'failed' })
      .eq('id', existing.id);
    await supabase
      .from('grow_credit_purchases')
      .update({ status: 'failed' })
      .eq('stripe_session_id', sessionId);
    return error((e as Error).message, 500);
  }
};
