import crypto from 'node:crypto';
import fs from 'node:fs';

const envPath = '.dev.vars';
const keyName = 'Grow Leads Agent';

function readDevVars() {
  const text = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of text.split(/\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return { env, text };
}

function setDevVar(text, key, value) {
  const line = `${key}="${value}"`;
  if (new RegExp(`^${key}=.*$`, 'm').test(text)) {
    return text.replace(new RegExp(`^${key}=.*$`, 'm'), line);
  }
  return `${text.replace(/\s*$/, '')}\n${line}\n`;
}

async function supabaseRequest(env, path, init = {}) {
  const response = await fetch(`${env.SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase request failed (${response.status}): ${text.slice(0, 300)}`);
  }

  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

const { env, text } = readDevVars();

if (env.AICRE8_API_KEY) {
  console.log('AICRE8_API_KEY already set locally');
  process.exit(0);
}

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.GROW_DEMO_USER_ID) {
  throw new Error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GROW_DEMO_USER_ID');
}

const raw = `ak_live_${crypto.randomBytes(32).toString('hex')}`;
const hash = crypto.createHash('sha256').update(raw).digest('hex');
const prefix = `ak_live_${raw.slice('ak_live_'.length, 'ak_live_'.length + 8)}`;

await supabaseRequest(env, '/rest/v1/api_keys', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    prefer: 'return=minimal',
  },
  body: JSON.stringify({
    user_id: env.GROW_DEMO_USER_ID,
    key_hash: hash,
    key_prefix: prefix,
    name: keyName,
  }),
});

fs.writeFileSync(envPath, setDevVar(text, 'AICRE8_API_KEY', raw));
console.log(`Created ${keyName} AICre8 API key and saved it locally`);
