import { request } from 'undici';
import { config } from '../config/env';

export interface CarImage {
  url:    string;
  alt:    string;
  source: 'unsplash' | 'none';
}

interface UnsplashPhoto {
  urls: { raw: string; full: string; regular: string };
  alt_description: string | null;
  user: { name: string };
}

interface UnsplashSearchResult {
  results: UnsplashPhoto[];
}

// Build search query: most specific first, then broaden
function buildQueries(make: string, model: string | null, year: number | null): string[] {
  const base = model ? `${make} ${model}` : make;
  const queries: string[] = [];
  if (model && year) queries.push(`${base} ${year} car`);
  if (model)         queries.push(`${base} car`);
  queries.push(`${make} car`);
  return [...new Set(queries)];
}

// Force a consistent 16:9 landscape crop via Unsplash/Imgix URL params.
function to16x9(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    u.searchParams.set('w',    '1200');
    u.searchParams.set('h',    '675');
    u.searchParams.set('fit',  'crop');
    u.searchParams.set('crop', 'entropy');
    u.searchParams.set('q',    '85');
    return u.toString();
  } catch {
    return rawUrl;
  }
}

async function searchUnsplashMultiple(query: string, count: number): Promise<CarImage[]> {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape&content_filter=high`;
  try {
    const res = await request(url, {
      method: 'GET',
      headers: {
        Authorization:    `Client-ID ${config.unsplash.accessKey}`,
        'Accept-Version': 'v1',
      },
      bodyTimeout:    config.httpTimeoutMs,
      headersTimeout: config.httpTimeoutMs,
    });
    if (res.statusCode !== 200) return [];
    const body = await res.body.json() as UnsplashSearchResult;
    return (body.results ?? []).map(photo => ({
      url:    to16x9(photo.urls.raw ?? photo.urls.full ?? photo.urls.regular),
      alt:    photo.alt_description ?? query,
      source: 'unsplash' as const,
    }));
  } catch {
    return [];
  }
}

// Returns up to 4 images: exterior shots first, then emblem
export async function fetchCarImages(
  make: string,
  model: string | null,
  year: number | null,
): Promise<CarImage[]> {
  if (!config.unsplash.accessKey) return [];

  const exteriorQuery = buildQueries(make, model, year)[0] ?? `${make} car`;
  const emblemQuery   = `${make} car badge emblem logo`;

  const [exterior, emblem] = await Promise.allSettled([
    searchUnsplashMultiple(exteriorQuery, 3),
    searchUnsplashMultiple(emblemQuery, 1),
  ]);

  const images: CarImage[] = [];
  if (exterior.status === 'fulfilled') images.push(...exterior.value);
  if (emblem.status   === 'fulfilled') images.push(...emblem.value);

  // Fallback: try broader queries if nothing found
  if (images.length === 0) {
    for (const q of buildQueries(make, model, year).slice(1)) {
      const fallback = await searchUnsplashMultiple(q, 3);
      if (fallback.length > 0) { images.push(...fallback); break; }
    }
  }

  return images;
}
