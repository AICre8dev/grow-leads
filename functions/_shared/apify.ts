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

// ---------------------------------------------------------------------------
// X / Twitter sourcing — used by the investor research engine.
// Default actor: apidojo/tweet-scraper (pay-per-result search scraper).
// Override with the APIFY_TWITTER_ACTOR env var if you switch scrapers.
// ---------------------------------------------------------------------------

const DEFAULT_TWITTER_ACTOR = 'apidojo~tweet-scraper';

// Raw tweet shape is defensive: different X scrapers name fields slightly
// differently, so the parser (extractTweet) tolerates several layouts.
export interface ApifyTweetRaw {
  text?: string;
  fullText?: string;
  url?: string;
  twitterUrl?: string;
  createdAt?: string;
  author?: {
    userName?: string;
    screen_name?: string;
    name?: string;
    description?: string;
    followers?: number;
    followersCount?: number;
    isVerified?: boolean;
    isBlueVerified?: boolean;
    location?: string;
  };
}

export interface SourcedAuthor {
  handle: string;
  name: string;
  bio: string;
  followers: number;
  verified: boolean;
  location: string;
  tweets: string[];
  url: string;
}

export async function startTweetScrape(
  token: string,
  opts: { searchTerms: string[]; maxItems: number; actor?: string },
): Promise<ApifyRun> {
  const actor = opts.actor || DEFAULT_TWITTER_ACTOR;
  const input = {
    searchTerms: opts.searchTerms,
    maxItems: opts.maxItems,
    sort: 'Latest',
    tweetLanguage: 'en',
  };

  const res = await fetch(`${APIFY_BASE}/acts/${actor}/runs?token=${token}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify tweet start failed: ${res.status} ${text}`);
  }
  const json: { data: ApifyRun } = await res.json();
  return json.data;
}

export async function getTweetDataset(token: string, datasetId: string): Promise<ApifyTweetRaw[]> {
  const res = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&clean=true`);
  if (!res.ok) throw new Error(`Apify getTweetDataset failed: ${res.status}`);
  return await res.json();
}

function extractTweet(t: ApifyTweetRaw): { handle: string; author: ApifyTweetRaw['author']; text: string; url: string } | null {
  const a = t.author || {};
  const handle = (a.userName || a.screen_name || '').trim().replace(/^@/, '');
  const text = (t.text || t.fullText || '').trim();
  if (!handle || !text) return null;
  return { handle, author: a, text, url: t.url || t.twitterUrl || `https://x.com/${handle}` };
}

// Collapse many tweets down to one entry per author, carrying their bio and up
// to `maxTweets` example posts — the raw material the LLM classifier scores.
export function groupByAuthor(raw: ApifyTweetRaw[], maxTweets = 4): SourcedAuthor[] {
  const byHandle = new Map<string, SourcedAuthor>();
  for (const t of raw) {
    const parsed = extractTweet(t);
    if (!parsed) continue;
    const a = parsed.author || {};
    const key = parsed.handle.toLowerCase();
    let entry = byHandle.get(key);
    if (!entry) {
      entry = {
        handle: parsed.handle,
        name: (a.name || parsed.handle).trim(),
        bio: (a.description || '').trim(),
        followers: a.followers ?? a.followersCount ?? 0,
        verified: Boolean(a.isVerified || a.isBlueVerified),
        location: (a.location || '').trim(),
        tweets: [],
        url: `https://x.com/${parsed.handle}`,
      };
      byHandle.set(key, entry);
    }
    if (entry.tweets.length < maxTweets) entry.tweets.push(parsed.text);
  }
  return [...byHandle.values()];
}
