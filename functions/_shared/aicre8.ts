// AICre8 site-builder wrapper.
// Posts a prompt with business details + Google reviews; receives a deployed site URL.

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

export async function buildSite(
  apiKey: string,
  apiUrl: string,
  input: BuildSiteInput,
): Promise<BuildSiteResult> {
  const prompt = renderSitePrompt(input);

  const res = await fetch(`${apiUrl}/api/agent/build-site`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      business: input, // pass structured data alongside prompt for any template hydration
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AICre8 build failed: ${res.status} ${text}`);
  }
  return await res.json();
}

function renderSitePrompt(biz: BuildSiteInput): string {
  const reviewLines = (biz.reviews || [])
    .slice(0, 5)
    .map((r) => `- "${(r.text || '').replace(/"/g, "'")}" — ${r.name || 'Customer'} (${r.stars || 5} stars)`)
    .join('\n');

  const hoursLines = (biz.hours || []).map((h) => `- ${h.day}: ${h.hours}`).join('\n');

  return `Build a clean, conversion-focused local-services website for this business.

BUSINESS: ${biz.businessName}
CATEGORY: ${biz.category || 'Local service'}
PHONE: ${biz.phone || 'N/A'}
ADDRESS: ${biz.address || 'N/A'}
RATING: ${biz.rating ? `${biz.rating}/5 (Google)` : 'N/A'}

SECTIONS (in order):
1. HERO — Business name as serif headline. One-line tagline ("Trusted ${biz.category || 'service'} in your area"). Primary CTA: call button with phone number. Secondary: "Get a quote" scrolls to contact.
2. SERVICES — 3-4 service cards with icons. Generate plausible services for a ${biz.category || 'local business'}.
3. GOOGLE REVIEWS — Real reviews below. Star ratings visible. Attribution "Reviews from Google".
${reviewLines}
4. ABOUT — Short 2-paragraph story. Mention years serving the area, values (quality/reliability/local).
5. CONTACT — Phone CTA + address + hours + contact form (name, phone, message).
${hoursLines ? `\nHOURS:\n${hoursLines}` : ''}
6. FOOTER — Business name, phone, address, copyright.

DESIGN:
- Clean, professional, not flashy. Warm off-white bg (#fafaf7), near-black text, one accent color (slate blue or warm gold — pick based on category).
- Serif headings (Instrument Serif), sans body (Inter).
- Mobile-first, generous whitespace, subtle shadows on cards.
- Phone number is clickable (tel:) everywhere it appears.

Do NOT use placeholder lorem ipsum. Write real, plausible copy for a ${biz.category || 'local service'} business called "${biz.businessName}".`;
}
