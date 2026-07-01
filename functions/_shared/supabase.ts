import { createClient } from '@supabase/supabase-js';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  GROW_DEMO_USER_ID?: string;
  APIFY_TOKEN?: string;
  APIFY_API_TOKEN?: string;
  APIFY_TWITTER_ACTOR?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  AICRE8_API_KEY?: string;
  AICRE8_API_URL?: string;
  CRON_SECRET: string;
  EMAIL_FROM?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_LIVE_SECRET_KEY?: string;
  STRIPE_SECRET_KEY_LIVE?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_LIVE_WEBHOOK_SECRET?: string;
  STRIPE_WEBHOOK_SECRET_LIVE?: string;
}

export function getSupabase(env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY binding');
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function error(message: string, status = 400) {
  return json({ error: message }, status);
}

export function getApifyToken(env: Env): string {
  const token = env.APIFY_TOKEN || env.APIFY_API_TOKEN;
  if (!token) throw new Error('Missing APIFY_TOKEN or APIFY_API_TOKEN binding');
  return token;
}

export function getAicre8ApiUrl(env: Env): string {
  return env.AICRE8_API_URL || 'https://aicre8.dev';
}

export function getAicre8ApiKey(env: Env): string {
  if (!env.AICRE8_API_KEY) throw new Error('Missing AICRE8_API_KEY binding');
  return env.AICRE8_API_KEY;
}

export function getEmailFrom(env: Env): string {
  const from = env.EMAIL_FROM || env.RESEND_FROM_EMAIL;
  if (!from) throw new Error('Missing EMAIL_FROM or RESEND_FROM_EMAIL binding');
  return from;
}

export function getStripeSecret(env: Env): string {
  const secret = env.STRIPE_SECRET_KEY || env.STRIPE_LIVE_SECRET_KEY || env.STRIPE_SECRET_KEY_LIVE;
  if (!secret) throw new Error('Missing STRIPE_SECRET_KEY binding');
  return secret;
}

export function getStripeWebhookSecret(env: Env): string {
  const secret = env.STRIPE_WEBHOOK_SECRET || env.STRIPE_LIVE_WEBHOOK_SECRET || env.STRIPE_WEBHOOK_SECRET_LIVE;
  if (!secret) throw new Error('Missing STRIPE_WEBHOOK_SECRET binding');
  return secret;
}
