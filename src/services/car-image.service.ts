import { request } from 'undici';
import { config } from '../config/env';

export interface CarImage {
  url:    string;
  alt:    string;
  source: 'unsplash' | 'wikipedia' | 'none';
}

// ── Unsplash ────────────────────────────────────────────────────────────────

interface UnsplashPhoto {
  urls: { raw: string; full: string; regular: string };
  alt_description: string | null;
}
interface UnsplashSearchResult { results: UnsplashPhoto[]; }

// Keywords that indicate a close-up/detail shot — filter these out
const CLOSE_UP_KEYWORDS = [
  'emblem', 'badge', 'logo', 'interior', 'steering', 'dashboard',
  'close-up', 'close up', 'detail', 'macro', 'hood ornament',
  'wheel rim', 'grille', 'headlight', 'taillight',
];

function isExteriorShot(altDescription: string | null): boolean {
  if (!altDescription) return true; // no description → keep it
  const desc = altDescription.toLowerCase();
  return !CLOSE_UP_KEYWORDS.some(kw => desc.includes(kw));
}

function buildBodyQueries(make: string, model: string | null, year: number | null): string[] {
  const base = model ? `${make} ${model}` : make;
  const queries: string[] = [];
  if (model && year) queries.push(`${base} ${year} car exterior side view`);
  if (model)         queries.push(`${base} car exterior side profile`);
  queries.push(`${make} car exterior full body`);
  queries.push(`${make} automobile`);
  return [...new Set(queries)];
}

// crop=center keeps the full car in frame; crop=entropy zooms to visual detail
function to16x9(rawUrl: string, crop: 'center' | 'entropy' = 'center'): string {
  try {
    const u = new URL(rawUrl);
    u.searchParams.set('w',    '1200');
    u.searchParams.set('h',    '675');
    u.searchParams.set('fit',  'crop');
    u.searchParams.set('crop', crop);
    u.searchParams.set('q',    '85');
    return u.toString();
  } catch {
    return rawUrl;
  }
}

async function searchUnsplash(
  query: string,
  count: number,
  crop: 'center' | 'entropy' = 'center',
): Promise<CarImage[]> {
  if (!config.unsplash.accessKey) return [];
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape&content_filter=high`;
  try {
    const res = await request(url, {
      method: 'GET',
      headers: { Authorization: `Client-ID ${config.unsplash.accessKey}`, 'Accept-Version': 'v1' },
      bodyTimeout:    config.httpTimeoutMs,
      headersTimeout: config.httpTimeoutMs,
    });
    if (res.statusCode !== 200) return [];
    const body = await res.body.json() as UnsplashSearchResult;
    return (body.results ?? []).map(p => ({
      url:    to16x9(p.urls.raw ?? p.urls.full ?? p.urls.regular, crop),
      alt:    p.alt_description ?? query,
      source: 'unsplash' as const,
    }));
  } catch {
    return [];
  }
}

// ── Wikipedia ───────────────────────────────────────────────────────────────
// Wikipedia car articles almost always have a clean side-profile press photo as
// the main image, making it the most reliable source for a "full car" first shot.

async function fetchWikipediaImage(make: string, model: string): Promise<CarImage | null> {
  const title = `${make} ${model}`;
  const url   = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=1200&format=json&redirects=1&origin=*`;
  try {
    const res  = await request(url, { bodyTimeout: config.httpTimeoutMs, headersTimeout: config.httpTimeoutMs });
    if (res.statusCode !== 200) return null;
    const body  = await res.body.json() as any;
    const pages = body?.query?.pages ?? {};
    const page  = Object.values(pages)[0] as any;
    if (!page || page.pageid === -1 || !page.thumbnail?.source) return null;
    return { url: page.thumbnail.source, alt: page.title ?? title, source: 'wikipedia' };
  } catch {
    return null;
  }
}

// ── Main export ─────────────────────────────────────────────────────────────
// Order: 1) Wikipedia side-profile  2) Unsplash exterior (filtered)  3) Unsplash emblem

export async function fetchCarImages(
  make: string,
  model: string | null,
  year: number | null,
): Promise<CarImage[]> {
  const bodyQuery   = buildBodyQueries(make, model, year)[0] ?? `${make} car exterior`;
  const emblemQuery = `${make} car emblem badge`;

  const [wikiResult, bodyResult, emblemResult] = await Promise.allSettled([
    model ? fetchWikipediaImage(make, model) : Promise.resolve(null),
    searchUnsplash(bodyQuery, 10, 'center'),   // fetch 10 so we have plenty to filter
    searchUnsplash(emblemQuery, 1, 'entropy'),
  ]);

  const images: CarImage[] = [];

  // 1. Wikipedia first — guaranteed side-profile if found
  if (wikiResult.status === 'fulfilled' && wikiResult.value) {
    images.push(wikiResult.value);
  }

  // 2. Filtered Unsplash exterior shots (no close-ups), up to 3
  if (bodyResult.status === 'fulfilled') {
    const exterior = bodyResult.value
      .filter(img => isExteriorShot(img.alt))
      .slice(0, 3);
    images.push(...exterior);
  }

  // 3. Emblem last
  if (emblemResult.status === 'fulfilled') {
    images.push(...emblemResult.value);
  }

  // Fallback: if still empty, try broader queries without filtering
  if (images.length === 0) {
    for (const q of buildBodyQueries(make, model, year).slice(1)) {
      const fallback = await searchUnsplash(q, 3, 'center');
      if (fallback.length > 0) { images.push(...fallback); break; }
    }
  }

  return images;
}
