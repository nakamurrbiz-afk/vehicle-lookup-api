import { request } from 'undici';
import { config } from '../config/env';

export interface CarImage {
  url: string;
  alt: string;
  source: 'wikipedia' | 'none';
}

// Attempts multiple Wikipedia article title formats to find an image
const titleCandidates = (make: string, model: string, year: number | null): string[] => {
  const m = `${make}_${model}`.replace(/\s+/g, '_');
  const candidates = [
    m,
    `${make}_${model}_${year ?? ''}`.replace(/\s+/g, '_').replace(/_$/, ''),
  ];
  return candidates;
};

async function fetchWikipediaSummary(title: string): Promise<CarImage | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  try {
    const res = await request(url, {
      method: 'GET',
      headers: { 'User-Agent': 'PlateCheck/1.0 (vehicle-lookup-service)' },
      bodyTimeout: config.httpTimeoutMs,
      headersTimeout: config.httpTimeoutMs,
    });

    if (res.statusCode !== 200) return null;

    const body = await res.body.json() as {
      type?: string;
      thumbnail?: { source: string; width: number; height: number };
      originalimage?: { source: string };
      title?: string;
    };

    // Reject disambiguation pages
    if (body.type === 'disambiguation') return null;

    const imageUrl = body.originalimage?.source ?? body.thumbnail?.source ?? null;
    if (!imageUrl) return null;

    // Request a larger thumbnail version from Wikimedia
    const largeUrl = imageUrl.replace(/\/\d+(px-[^/]+)$/, '/800$1');

    return {
      url: largeUrl,
      alt: body.title ?? title.replace(/_/g, ' '),
      source: 'wikipedia',
    };
  } catch {
    return null;
  }
}

export async function fetchCarImage(
  make: string,
  model: string,
  year: number | null,
): Promise<CarImage> {
  const candidates = titleCandidates(make, model, year);

  for (const title of candidates) {
    const result = await fetchWikipediaSummary(title);
    if (result) return result;
  }

  return { url: '', alt: `${make} ${model}`, source: 'none' };
}
