import type { Env } from './supabase';
import { getStripeSecret } from './supabase';
import type { GrowCreditPack } from './growPlans';

export interface StripeCheckoutSession {
  id: string;
  url?: string;
  metadata?: Record<string, string>;
  payment_status?: string;
}

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

export async function createStripeCheckoutSession(env: Env, input: {
  pack: GrowCreditPack;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<StripeCheckoutSession> {
  const body = new URLSearchParams();
  body.set('mode', 'payment');
  body.set('success_url', input.successUrl);
  body.set('cancel_url', input.cancelUrl);
  body.set('client_reference_id', input.userId);
  body.set('line_items[0][price_data][currency]', 'usd');
  body.set('line_items[0][price_data][unit_amount]', String(input.pack.amountCents));
  body.set('line_items[0][price_data][product_data][name]', `Grow ${input.pack.label}`);
  body.set('line_items[0][quantity]', '1');
  body.set('metadata[userId]', input.userId);
  body.set('metadata[credits]', String(input.pack.credits));
  body.set('metadata[packId]', input.pack.id);

  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: 'POST',
    headers: stripeHeaders(env),
    body,
  });

  return parseStripeResponse<StripeCheckoutSession>(response);
}

export async function retrieveStripeCheckoutSession(
  env: Env,
  sessionId: string,
): Promise<StripeCheckoutSession> {
  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions/${sessionId}`, {
    headers: stripeHeaders(env),
  });

  return parseStripeResponse<StripeCheckoutSession>(response);
}

export async function verifyStripeWebhook(
  payload: string,
  signature: string | null,
  webhookSecret: string,
): Promise<boolean> {
  if (!signature || !webhookSecret) return false;

  const parts = Object.fromEntries(
    signature.split(',').map((part) => {
      const [key, value] = part.split('=');
      return [key, value];
    }),
  );
  const timestamp = parts.t;
  const expected = parts.v1;
  if (!timestamp || !expected) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signedPayload),
  );
  const actual = [...new Uint8Array(signatureBytes)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return timingSafeEqual(actual, expected);
}

function stripeHeaders(env: Env): HeadersInit {
  return {
    authorization: `Bearer ${getStripeSecret(env)}`,
    'content-type': 'application/x-www-form-urlencoded',
  };
}

async function parseStripeResponse<T>(response: Response): Promise<T> {
  const data = await response.json<Record<string, unknown>>();
  if (!response.ok) {
    const stripeError = data.error as { message?: string } | undefined;
    throw new Error(stripeError?.message || `Stripe request failed with ${response.status}`);
  }

  return data as T;
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let i = 0; i < left.length; i += 1) {
    result |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return result === 0;
}
