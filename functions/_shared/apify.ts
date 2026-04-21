// Thin Apify REST wrapper. Uses fetch directly — safer in Workers runtime than apify-client SDK.

const APIFY_BASE = 'https://api.apify.com/v2';
const ACTOR_ID = 'compass~crawler-google-places'; // Google Maps scraper, ~$0.002/place

export interface ApifyPlace {
  title: string;
  phone?: string;
  website?: string | null;
  emails?: string[];
  address?: string;
  placeId?: string;
  totalScore?: number;
  reviewsCount?: number;
  reviews?: Array<{
    name?: string;
    text?: string;
    stars?: number;
    publishedAtDate?: string;
  }>;
  imageUrls?: string[];
  openingHours?: Array<{ day: string; hours: string }>;
  categoryName?: string;
}

export interface ApifyRun {
  id: string;
  status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTED' | 'TIMED-OUT';
  defaultDatasetId: string;
  startedAt: string;
  finishedAt?: string;
}

export async function startPlacesScrape(token: string, opts: {
  niche: string;
  city: string;
  maxResults: number;
}): Promise<ApifyRun> {
  const input = {
    searchStringsArray: [opts.niche],
    locationQuery: opts.city,
    maxCrawledPlacesPerSearch: opts.maxResults,
    language: 'en',
    skipClosedPlaces: true,
    scrapePlaceDetailPage: true,
    scrapeReviewsPersonalData: false,
    maxReviews: 5,
    maxImages: 3,
  };

  const res = await fetch(`${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${token}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify start failed: ${res.status} ${text}`);
  }
  const json: { data: ApifyRun } = await res.json();
  return json.data;
}

export async function getRun(token: string, runId: string): Promise<ApifyRun> {
  const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`);
  if (!res.ok) throw new Error(`Apify getRun failed: ${res.status}`);
  const json: { data: ApifyRun } = await res.json();
  return json.data;
}

export async function getDataset(token: string, datasetId: string): Promise<ApifyPlace[]> {
  const res = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&clean=true`);
  if (!res.ok) throw new Error(`Apify getDataset failed: ${res.status}`);
  return await res.json();
}
