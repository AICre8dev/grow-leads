import fs from 'node:fs';

const envPath = '.dev.vars';
const requiredBindings = [
  { label: 'SUPABASE_URL', keys: ['SUPABASE_URL'] },
  { label: 'SUPABASE_SERVICE_ROLE_KEY', keys: ['SUPABASE_SERVICE_ROLE_KEY'] },
  { label: 'GROW_DEMO_USER_ID', keys: ['GROW_DEMO_USER_ID'] },
  { label: 'APIFY token', keys: ['APIFY_TOKEN', 'APIFY_API_TOKEN'] },
  { label: 'AICRE8_API_KEY', keys: ['AICRE8_API_KEY'] },
  { label: 'AICRE8_API_URL', keys: ['AICRE8_API_URL'] },
  { label: 'RESEND_API_KEY', keys: ['RESEND_API_KEY'] },
  { label: 'Email sender', keys: ['EMAIL_FROM', 'RESEND_FROM_EMAIL'] },
  { label: 'CRON_SECRET', keys: ['CRON_SECRET'] },
];
const optionalBindings = [
  { label: 'Stripe secret', keys: ['STRIPE_SECRET_KEY', 'STRIPE_LIVE_SECRET_KEY', 'STRIPE_SECRET_KEY_LIVE'] },
  {
    label: 'Stripe webhook secret',
    keys: ['STRIPE_WEBHOOK_SECRET', 'STRIPE_LIVE_WEBHOOK_SECRET', 'STRIPE_WEBHOOK_SECRET_LIVE'],
  },
];
const tables = [
  'lead_campaigns',
  'lead_engine_leads',
  'grow_usage_balances',
  'grow_usage_events',
  'grow_credit_purchases',
  'grow_stripe_checkout_sessions',
];

function readDevVars() {
  if (!fs.existsSync(envPath)) {
    return { error: `${envPath} does not exist. Copy .dev.vars.example to .dev.vars first.`, env: {} };
  }

  const env = {};
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return { env };
}

function bindingIsSet(binding, env) {
  return binding.keys.some((key) => Boolean(env[key]));
}

function printBindingStatus(label, bindings, env) {
  console.log(`\n${label}`);
  for (const binding of bindings) {
    console.log(`- ${binding.label} (${binding.keys.join(' or ')}): ${bindingIsSet(binding, env) ? 'SET' : 'MISSING'}`);
  }
}

async function checkTable(env, table) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`;
  try {
    const response = await fetch(url, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (response.ok) return { table, ok: true };

    const body = await response.json().catch(() => ({}));
    return {
      table,
      ok: false,
      status: response.status,
      message: body.message || response.statusText,
    };
  } catch (e) {
    return {
      table,
      ok: false,
      status: 0,
      message: (e instanceof Error ? e.message : 'network check failed'),
    };
  }
}

const { env, error } = readDevVars();
if (error) {
  console.error(error);
  process.exit(1);
}

console.log('Grow Leads Agent setup check');
printBindingStatus('Required bindings', requiredBindings, env);
printBindingStatus('Optional bindings', optionalBindings, env);

const missingRequired = requiredBindings.filter((binding) => !bindingIsSet(binding, env));
if (missingRequired.length > 0) {
  console.log(`\nMissing required values: ${missingRequired.map((binding) => binding.label).join(', ')}`);
}

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\nSkipping Supabase schema check until Supabase URL and service role key are set.');
  process.exit(missingRequired.length > 0 ? 1 : 0);
}

console.log('\nSupabase schema');
const results = await Promise.all(tables.map((table) => checkTable(env, table)));
for (const result of results) {
  if (result.ok) {
    console.log(`- ${result.table}: OK`);
  } else {
    console.log(`- ${result.table}: MISSING (${result.message})`);
  }
}

const missingTables = results.filter((result) => !result.ok);
if (missingTables.length > 0) {
  console.log('\nApply the SQL files in supabase/migrations in timestamp order, then run this check again.');
}

if (missingRequired.length > 0 || missingTables.length > 0) {
  process.exit(1);
}

console.log('\nReady: env bindings and Supabase schema are wired.');
