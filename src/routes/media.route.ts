import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { fetchCarImage } from '../services/wikipedia.service';
import { buildListings, ListingLink } from '../services/listings.service';
import {
  scrapeAutoTraderUK,
  scrapeMotorsUK,
  scrapeCarGurusUS,
  scrapeAutoTraderUS,
} from '../services/price-scraper.service';

const QuerySchema = z.object({
  make:     z.string().min(1),
  model:    z.string().optional(),   // optional — null when DVSA enrichment is pending
  year:     z.coerce.number().int().optional(),
  country:  z.string().length(2).transform(s => s.toUpperCase()),
  postcode: z.string().optional(),   // UK postcode or US zip code
});

// Attach scraped prices to each listing entry
async function enrichWithPrices(
  listings: ListingLink[],
  make: string,
  model: string | null,
  year: number | null,
  country: string,
): Promise<ListingLink[]> {
  if (country === 'GB') {
    const yearFrom = year ? year - 2 : undefined;
    const [at, mo] = await Promise.allSettled([
      model ? scrapeAutoTraderUK(make, model, yearFrom) : Promise.resolve({ minPrice: null, count: null }),
      model ? scrapeMotorsUK(make, model)               : Promise.resolve({ minPrice: null, count: null }),
    ]);

    return listings.map(l => {
      if (l.id === 'autotrader-uk' && at.status === 'fulfilled')
        return { ...l, minPrice: at.value.minPrice };
      if (l.id === 'motors-uk' && mo.status === 'fulfilled')
        return { ...l, minPrice: mo.value.minPrice };
      return l;
    });
  }

  if (country === 'US') {
    const [cg, at] = await Promise.allSettled([
      model ? scrapeCarGurusUS(make, model)   : Promise.resolve({ minPrice: null, count: null }),
      model ? scrapeAutoTraderUS(make, model) : Promise.resolve({ minPrice: null, count: null }),
    ]);

    return listings.map(l => {
      if (l.id === 'cargurus-us'   && cg.status === 'fulfilled')
        return { ...l, minPrice: cg.value.minPrice };
      if (l.id === 'autotrader-us' && at.status === 'fulfilled')
        return { ...l, minPrice: at.value.minPrice };
      return l;
    });
  }

  return listings;
}

export async function mediaRoute(app: FastifyInstance): Promise<void> {
  // GET /v1/vehicle-media?make=Toyota&model=Alphard&year=2024&country=GB
  app.get<{ Querystring: Record<string, string> }>('/vehicle-media', async (request, reply) => {
    const parsed = QuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        status: 400,
        title:  'Bad Request',
        detail: parsed.error.issues.map(i => i.message).join(', '),
      });
    }

    const { make, year, country, postcode } = parsed.data;
    const model = parsed.data.model ?? null;
    // postcode is user-specific → excluded from cache key (each user gets fresh URLs)
    const cacheKey = `media:v3:${country}:${make}:${model ?? 'unknown'}:${year ?? 'any'}`.toLowerCase();

    // For cached results, still inject the current postcode into listing URLs
    const cached = await app.cache.get(cacheKey);
    if (cached) {
      const result = JSON.parse(cached);
      if (postcode) {
        // Rebuild listings with the user's postcode (image stays cached)
        result.listings = buildListings(make, model, year ?? null, country, postcode);
      }
      return reply.send(result);
    }

    const baseListings = buildListings(make, model, year ?? null, country, postcode);

    // Fetch image and prices in parallel (prices are best-effort)
    const [image, listings] = await Promise.all([
      fetchCarImage(make, model, year ?? null),
      enrichWithPrices(baseListings, make, model, year ?? null, country),
    ]);

    const result = { image, listings };

    // Cache: 30 min for price data (changes during the day)
    await app.cache.set(cacheKey, JSON.stringify(result), 1800);

    return reply.send(result);
  });
}
