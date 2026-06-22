import type { getSupabase, Env } from './supabase';

export async function getRequestUserId(
  request: Request,
  env: Env,
  supabase: ReturnType<typeof getSupabase>,
): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (token) {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user?.id) return data.user.id;
  }

  return request.headers.get('x-grow-user-id') || env.GROW_DEMO_USER_ID || null;
}

