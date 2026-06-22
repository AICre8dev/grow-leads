import type { Env } from '../../../_shared/supabase';
import { getSupabase, json, error } from '../../../_shared/supabase';
import { getRequestUserId } from '../../../_shared/auth';
import { consumeGrowUsage } from '../../../_shared/usage';

interface ConsumeBody {
  event_type: string;
  client_id?: string | null;
  quantity?: number;
  credits_delta?: number;
  voice_minutes_delta?: number;
  provider_spend_cents?: number;
  provider_tokens_input?: number | null;
  provider_tokens_output?: number | null;
  metadata?: Record<string, unknown>;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return error('Method not allowed', 405);

  let body: ConsumeBody;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }

  if (!body.event_type) return error('event_type required');

  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase(env);
  } catch (e) {
    return error((e as Error).message, 500);
  }

  const userId = await getRequestUserId(request, env, supabase);
  if (!userId) return error('Unauthorized', 401);

  try {
    const usage = await consumeGrowUsage(supabase, {
      userId,
      clientId: body.client_id,
      eventType: body.event_type,
      quantity: body.quantity,
      creditsDelta: body.credits_delta,
      voiceMinutesDelta: body.voice_minutes_delta,
      providerSpendCents: body.provider_spend_cents,
      providerTokensInput: body.provider_tokens_input,
      providerTokensOutput: body.provider_tokens_output,
      metadata: body.metadata,
    });

    return json({ usage });
  } catch (e) {
    const message = (e as Error).message;
    if (message.includes('voice_limit_exceeded')) {
      return error('Voice minute safety cap reached', 402);
    }
    if (message.includes('provider_spend_limit_exceeded')) {
      return error('Provider spend safety cap reached', 402);
    }
    return error(message, 500);
  }
};

