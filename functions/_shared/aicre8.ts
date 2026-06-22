// AICre8 site-builder wrapper.
// Creates a project through the public v1 API, generates the site, builds it, and deploys it.

export interface BuildSiteInput {
  businessName: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
  rating?: number;
  reviews?: Array<{ name?: string; text?: string; stars?: number }>;
  photos?: string[];
  hours?: Array<{ day: string; hours: string }>;
}

export interface BuildSiteResult {
  projectId: string;
  siteUrl: string;
}

interface Aicre8Project {
  id: string;
  url_id?: string;
  name?: string;
}

interface Aicre8RunResult {
  exit_code: number;
  stdout?: string;
  stderr?: string;
}

interface Aicre8DeployResult {
  url?: string;
  netlify_url?: string;
  status?: string;
}

export async function buildSite(
  apiKey: string,
  apiUrl: string,
  input: BuildSiteInput,
): Promise<BuildSiteResult> {
  const prompt = renderSitePrompt(input);
  const api = new Aicre8PublicApi(apiKey, apiUrl);

  const project = await api.createProject({
    name: `${input.businessName} website`,
    access_type: 'Link',
  });
  const projectRef = project.url_id || project.id;

  await api.generateSite(projectRef, prompt);

  const build = await api.runCommand(projectRef, buildCommand(), 300_000);
  if (build.exit_code !== 0) {
    throw new Error(
      `AICre8 build command failed: ${build.stderr || build.stdout || `exit ${build.exit_code}`}`,
    );
  }

  const files = parseFilesFromRun(await api.runCommand(projectRef, collectDistFilesCommand(), 300_000));
  const deploy = await api.deployProject(projectRef, files);
  const siteUrl = deploy.netlify_url || deploy.url;

  if (!siteUrl) {
    throw new Error('AICre8 deploy did not return a site URL');
  }

  return {
    projectId: project.id,
    siteUrl,
  };
}

class Aicre8PublicApi {
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey: string,
    apiUrl: string,
  ) {
    this.baseUrl = normalizeApiBaseUrl(apiUrl);
  }

  async createProject(params: { name: string; access_type: 'Public' | 'Private' | 'Link' }): Promise<Aicre8Project> {
    return await this.request<Aicre8Project>('POST', '/projects', params);
  }

  async generateSite(projectRef: string, prompt: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(projectRef)}/generate`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ prompt, chat_mode: 'build' }),
    });

    if (!res.ok) {
      throw new Error(`AICre8 generate failed: ${res.status} ${await responseText(res)}`);
    }

    await drainResponse(res);
  }

  async runCommand(projectRef: string, command: string, timeoutMs: number): Promise<Aicre8RunResult> {
    return await this.request<Aicre8RunResult>('POST', `/projects/${encodeURIComponent(projectRef)}/run`, {
      command,
      timeout_ms: timeoutMs,
    });
  }

  async deployProject(projectRef: string, files: Record<string, string>): Promise<Aicre8DeployResult> {
    return await this.request<Aicre8DeployResult>('POST', `/projects/${encodeURIComponent(projectRef)}/deploy`, {
      files,
    });
  }

  private get headers(): Record<string, string> {
    return {
      authorization: `Bearer ${this.apiKey}`,
      'content-type': 'application/json',
    };
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`AICre8 API failed: ${method} ${path} ${res.status} ${await responseText(res)}`);
    }

    return await res.json();
  }
}

function normalizeApiBaseUrl(apiUrl: string): string {
  const trimmed = apiUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
}

async function responseText(res: Response): Promise<string> {
  const text = await res.text();
  return text.slice(0, 1_000);
}

async function drainResponse(res: Response): Promise<void> {
  if (!res.body) {
    return;
  }

  const reader = res.body.getReader();

  while (true) {
    const { done } = await reader.read();
    if (done) {
      break;
    }
  }
}

function buildCommand(): string {
  return [
    'set -e',
    'if [ -f package.json ]; then',
    'npm install',
    'if npm run | grep -q " build"; then npm run build; else mkdir -p dist && cp index.html dist/index.html; fi',
    'else',
    'mkdir -p dist && cp index.html dist/index.html',
    'fi',
  ].join('; ');
}

function collectDistFilesCommand(): string {
  const script = `
const fs = require('fs');
const path = require('path');
const root = 'dist';
const out = {};
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else {
      const rel = path.relative(root, full).split(path.sep).join('/');
      out[rel] = '__b64__' + fs.readFileSync(full).toString('base64');
    }
  }
}
walk(root);
console.log(JSON.stringify(out));
`;

  return `node -e ${JSON.stringify(script)}`;
}

function parseFilesFromRun(run: Aicre8RunResult): Record<string, string> {
  if (run.exit_code !== 0) {
    throw new Error(`AICre8 file collection failed: ${run.stderr || run.stdout || `exit ${run.exit_code}`}`);
  }

  try {
    const files = JSON.parse(run.stdout || '{}');

    if (!files || typeof files !== 'object' || Array.isArray(files) || Object.keys(files).length === 0) {
      throw new Error('dist file map was empty');
    }

    return files as Record<string, string>;
  } catch (err) {
    throw new Error(`AICre8 file collection returned invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function renderSitePrompt(biz: BuildSiteInput): string {
  const reviewLines = (biz.reviews || [])
    .slice(0, 5)
    .map((r) => `- "${(r.text || '').replace(/"/g, "'")}" — ${r.name || 'Customer'} (${r.stars || 5} stars)`)
    .join('\n');

  const hoursLines = (biz.hours || []).map((h) => `- ${h.day}: ${h.hours}`).join('\n');
  const photoLines = (biz.photos || [])
    .slice(0, 4)
    .map((photo) => `- ${photo}`)
    .join('\n');
  const category = biz.category || 'local service';
  const phone = biz.phone || 'N/A';
  const email = biz.email || 'N/A';
  const address = biz.address || 'N/A';

  return `Build a premium, conversion-focused local-services website for this business.

BUSINESS: ${biz.businessName}
CATEGORY: ${category}
PHONE: ${phone}
EMAIL: ${email}
ADDRESS: ${address}
RATING: ${biz.rating ? `${biz.rating}/5 (Google)` : 'N/A'}
${photoLines ? `\nAVAILABLE PHOTOS:\n${photoLines}` : ''}

GOAL:
Create a site that a small agency could proudly send to the business owner as a live preview. It should feel polished, trustworthy, modern, and specific to a ${category} business, not like a generic template.

FIRST VIEWPORT:
- Make the business name an obvious first-screen signal.
- Use a confident headline that sells the outcome for local customers.
- Include a short trust strip near the top with rating, location, fast booking, and local service cues.
- Primary CTA must be a clickable phone link using ${phone}. Secondary CTA scrolls to the contact form.
- Add a sticky mobile call/book bar.

SECTIONS (in order):
1. HERO — Strong headline, short benefit-led copy, primary phone CTA, secondary booking CTA, trust strip, and a visual panel. If photos are available, use the strongest relevant photo in the hero. If no photo is available, use refined CSS visual treatment, not placeholder imagery.
2. SERVICES — 4 polished service cards with simple inline SVG or emoji-free CSS icons. Generate plausible services for a ${category} business.
3. WHY CHOOSE US — 3 practical reasons to book with this business, based on category, rating, address, and review sentiment.
4. GOOGLE REVIEWS — Real reviews below. Star ratings visible. Attribution "Reviews from Google".
${reviewLines}
5. ABOUT — Short 2-paragraph local story. Mention serving the area, reliability, care, and practical service quality. Do not invent awards, certifications, or exact years unless supplied.
6. LOCATION / HOURS — Address, service area, hours, and a compact "what happens next" booking flow.
${hoursLines ? `\nHOURS:\n${hoursLines}` : ''}
7. CONTACT — Phone CTA, email if available, address, and contact form with name, phone, message.
8. FOOTER — Business name, phone, address, copyright, and local service category.

DESIGN:
- Use a premium agency-grade visual system, not a flat default webpage.
- Keep cards at 8px radius or less. Do not place cards inside cards.
- Avoid one-note beige, purple, slate, or brown palettes. Pick a balanced palette with neutral background, strong dark text, one confident accent, and one warm supporting color based on the business category.
- Use serif display headings (Instrument Serif or Georgia fallback) and clean sans body text (Inter/system fallback).
- Mobile-first. Desktop should have strong grid rhythm, clear spacing, and professional density.
- Buttons must be obvious, accessible, and never overflow on mobile.
- Use CSS only for motion and decoration; no external UI frameworks are required.
- Include subtle hover/focus states and good contrast.
- Phone number is clickable (tel:) everywhere it appears. Email is clickable (mailto:) when available.
- Include LocalBusiness JSON-LD using the known business data.

IMPLEMENTATION:
- Build a complete responsive site that can run as a static app after npm install/build.
- Do not use placeholder lorem ipsum.
- Do not show fake unavailable claims like "award-winning", "since 1998", or named staff unless supplied.
- Contact form can be front-end only, but it should look real and professional.
- Write real, plausible copy for a ${category} business called "${biz.businessName}".`;
}
