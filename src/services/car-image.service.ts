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
}

interface UnsplashSearchResult {
  results: UnsplashPhoto[];
}

// Full-car exterior queries — emphasise full body, side/front view
function buildBodyQueries(make: string, model: string | null, year: number | null): string[] {
  const base = model ? `${make} ${model}` : make;
  const queries: string[] = [];
  if (model && year) queries.push(`${base} ${year} car exterior side view`);
  if (model)         queries.push(`${base} car exterior side profile`);
  queries.push(`${make} car exterior full body`);
  queries.push(`${make} automobile`);
  return [...new Set(queries)];
}

// crop=center keeps the full car visible in the frame (vs entropy which zooms into detail)
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
      url:    to16x9(photo.urls.raw ?? photo.urls.full ?? photo.urls.regular, crop),
      alt:    photo.alt_description ?? query,
      source: 'unsplash' as const,
    }));
  } catch {
    return [];
  }
}

// Returns images: full-car exterior first (at least 1), emblem last
export async function fetchCarImages(
  make: string,
  model: string | null,
  year: number | null,
): Promise<CarImage[]> {
  if (!config.unsplash.accessKey) return [];

  const bodyQueries = buildBodyQueries(make, model, year);
  const emblemQuery = `${make} car emblem badge close-up`;

  // Fetch body shots (crop=center) and emblem (crop=entropy) in parallel
  const [bodyResult, emblemResult] = await Promise.allSettled([
    searchUnsplash(bodyQueries[0], 3, 'center'),
    searchUnsplash(emblemQuery,    1, 'entropy'),
  ]);

  const bodyImages   = bodyResult.status   === 'fulfilled' ? bodyResult.value   : [];
  const emblemImages = emblemResult.status === 'fulfilled' ? emblemResult.value : [];

  // Try fallback body queries if first returned nothing
  let finalBodyImages = bodyImages;
  if (finalBodyImages.length === 0) {
    for (const q of bodyQueries.slice(1)) {
      const fallback = await searchUnsplash(q, 3, 'center');
      if (fallback.length > 0) { finalBodyImages = fallback; break; }
    }
  }

  // Always put at least one body shot first, emblem last
  return [...finalBodyImages, ...emblemImages];
}
