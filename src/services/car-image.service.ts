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
// Replaces fit=max (letterbox) with fit=crop&crop=entropy (smart-crop to subject).
function to16x9(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    u.searchParams.set('w',    '1200');
    u.searchParams.set('h',    '675');
    u.searchParams.set('fit',  'crop');
    u.searchParams.set('crop', 'entropy');  // focus on visually interesting area
    u.searchParams.set('q',    '85');
    return u.toString();
  } catch {
    return rawUrl;
  }
}

async function searchUnsplash(query: string): Promise<CarImage | null> {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&content_filter=high`;
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
    if (res.statusCode !== 200) return null;
    const body = await res.body.json() as UnsplashSearchResult;
    const photo = body.results?.[0];
    if (!photo) return null;
    return {
      url:    to16x9(photo.urls.raw ?? photo.urls.full ?? photo.urls.regular),
      alt:    photo.alt_description ?? query,
      source: 'unsplash',
    };
  } catch {
    return null;
  }
}

export async function fetchCarImage(
  make: string,
  model: string | null,
  year: number | null,
): Promise<CarImage> {
  const alt = model ? `${make} ${model}` : make;

  if (!config.unsplash.accessKey) {
    return { url: '', alt, source: 'none' };
  }

  for (const query of buildQueries(make, model, year)) {
    const result = await searchUnsplash(query);
    if (result) return result;
  }

  return { url: '', alt, source: 'none' };
}
