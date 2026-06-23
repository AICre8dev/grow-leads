import { Lead } from '../types';

// Lead-qualification signals for the "opportunity finder".
// Phase A: Google reviews opportunity (computed from data we already scrape).
// Phase B will add a website/SEO opportunity via the AICre8 seo-audit engine.

export const LOW_RATING = 4.0;
export const FEW_REVIEWS = 25;

export interface ReviewOpportunity {
  isOpportunity: boolean;
  reasons: string[];
  /** short package label to pitch, e.g. "Review Boost" */
  pitch: string;
}

/**
 * A business is a Google-reviews opportunity (sell a Review Boost package) when
 * it has no reviews, few reviews, or a low rating. Only flags on real data —
 * an unknown rating/count is treated as "no signal", not an opportunity.
 */
export function getReviewOpportunity(lead: Lead): ReviewOpportunity {
  const reasons: string[] = [];
  const rating = typeof lead.rating === 'number' ? lead.rating : undefined;
  const count = typeof lead.reviewsCount === 'number' ? lead.reviewsCount : undefined;

  if (count !== undefined) {
    if (count === 0) reasons.push('No Google reviews');
    else if (count < FEW_REVIEWS) reasons.push(`Only ${count} reviews`);
  }
  if (rating !== undefined && rating > 0 && rating < LOW_RATING) {
    reasons.push(`Low rating ${rating.toFixed(1)}★`);
  }

  return {
    isOpportunity: reasons.length > 0,
    reasons,
    pitch: reasons.length > 0 ? 'Review Boost' : '',
  };
}

// "Striking distance" = visible in the map results but not yet winning. These
// are the best Rank Boost prospects: a small push lands them in the top 3.
export const STRIKING_MIN = 4; // ranks 1-3 are already at the top
export const STRIKING_MAX = 20; // beyond ~page 2 of the map results = too far

// Website signal. Real "bad website" = an SEO score (C2). Until then we flag
// what's detectable from the URL alone: no site, no HTTPS, or social-page-only.
const SOCIAL_OR_BUILDER_HOSTS = [
  'facebook.com', 'm.facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'linktr.ee', 'linktree', 'business.site', 'wixsite.com', 'sites.google.com',
];

export const WEAK_SEO = 60; // overall_score below this = a "bad website" worth a rebuild

export interface WebsiteOpportunity {
  hasSite: boolean;
  label: string; // '', 'No website', 'Bad site NN/100', 'No HTTPS', 'Social page only', 'SEO NN/100'
  isOpportunity: boolean;
  pitch: string; // 'Build a website' | 'Rebuild + SEO' | ''
  score?: number; // SEO score 0-100 once audited (C2)
}

export function getWebsiteOpportunity(lead: Lead): WebsiteOpportunity {
  const site = (lead.website || '').trim();
  if (!site) return { hasSite: false, label: 'No website', isOpportunity: true, pitch: 'Build a website' };

  const score = typeof lead.seoScore === 'number' ? lead.seoScore : undefined;
  const lower = site.toLowerCase();

  // A real SEO grade wins when we have it.
  if (score !== undefined && score < WEAK_SEO)
    return { hasSite: true, label: `Bad site ${score}/100`, isOpportunity: true, pitch: 'Rebuild + SEO', score };
  if (lower.startsWith('http://'))
    return { hasSite: true, label: 'No HTTPS', isOpportunity: true, pitch: 'Rebuild + SEO', score };
  if (SOCIAL_OR_BUILDER_HOSTS.some((h) => lower.includes(h)))
    return { hasSite: true, label: 'Social page only', isOpportunity: true, pitch: 'Build a website', score };

  // Has a site that looks fine — show the score as a neutral chip if we have it.
  return { hasSite: true, label: score !== undefined ? `SEO ${score}/100` : '', isOpportunity: false, pitch: '', score };
}

export type RankBand = 'top' | 'striking' | 'far' | 'unknown';

export function getRankBand(lead: Lead): RankBand {
  const r = lead.mapRank;
  if (typeof r !== 'number' || r < 1) return 'unknown';
  if (r < STRIKING_MIN) return 'top';
  if (r <= STRIKING_MAX) return 'striking';
  return 'far';
}
