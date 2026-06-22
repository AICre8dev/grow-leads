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
