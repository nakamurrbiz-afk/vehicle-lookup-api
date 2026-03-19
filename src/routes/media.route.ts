import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { fetchCarImages } from '../services/car-image.service';
import { buildListings, ListingLink } from '../services/listings.service';
import { getNewCarPrice } from '../services/new-car-price.service';
import {
  scrapeAutoTraderUK,
  scrapeMotorsUK,
  scrapeCarGurusUS,
  scrapeAutoTraderUS,
  scrapeCarSensorJP,
  scrapeGoonetJP,
  scrapeMarktplaatsNL,
} from '../services/price-scraper.service';

const QuerySchema = z.object({
  make:     z.string().min(1),
  model:    z.string().optional(),
  year:     z.coerce.number().int().optional(),
  country:  z.string().length(2).transform(s => s.toUpperCase()),
  postcode: z.string().optional(),
});

interface PriceSummary {
  new:  { from: string; to: string; note?: string; source: string } | null;
  used: { from: string; source: string } | null;
}

async function buildPriceSummary(
  make: string,
  model: string | null,
  year: number | null,
  country: string,
): Promise<PriceSummary> {
  const newPrice = getNewCarPrice(make, model);

  let usedFrom: string | null = null;
  let usedSource: string | null = null;

  if (country === 'GB' && model) {
    const yearFrom = year ? year - 2 : undefined;
    const [at, mo] = await Promise.allSettled([
      scrapeAutoTraderUK(make, model, yearFrom),
      scrapeMotorsUK(make, model),
    ]);
    const candidates = [
      at.status === 'fulfilled' ? at.value.minPrice : null,
      mo.status === 'fulfilled' ? mo.value.minPrice : null,
    ].filter(Boolean) as string[];

    if (candidates.length > 0) {
      usedFrom   = candidates[0];
      usedSource = at.status === 'fulfilled' && at.value.minPrice
        ? 'AutoTrader UK'
        : 'Motors.co.uk';
    }
  }

  if (country === 'US' && model) {
    const [cg, at] = await Promise.allSettled([
      scrapeCarGurusUS(make, model),
      scrapeAutoTraderUS(make, model),
    ]);
    const candidates = [
      cg.status === 'fulfilled' ? cg.value.minPrice : null,
      at.status === 'fulfilled' ? at.value.minPrice : null,
    ].filter(Boolean) as string[];

    if (candidates.length > 0) {
      usedFrom   = candidates[0];
      usedSource = 'CarGurus / AutoTrader US';
    }
  }

  if (country === 'JP' && model) {
    const [cs, gn] = await Promise.allSettled([
      scrapeCarSensorJP(make, model),
      scrapeGoonetJP(make, model),
    ]);
    const candidates = [
      cs.status === 'fulfilled' ? cs.value.minPrice : null,
      gn.status === 'fulfilled' ? gn.value.minPrice : null,
    ].filter(Boolean) as string[];

    if (candidates.length > 0) {
      usedFrom   = candidates[0];
      usedSource = 'CarSensor / Goo-net';
    }
  }

  if (country === 'NL' && model) {
    const mp = await scrapeMarktplaatsNL(make, model).catch(() => ({ minPrice: null, count: null }));
    if (mp.minPrice) {
      usedFrom   = mp.minPrice;
      usedSource = 'Marktplaats';
    }
  }

  return {
    new:  newPrice ? { from: newPrice.from, to: newPrice.to, note: newPrice.note, source: newPrice.source } : null,
    used: usedFrom ? { from: usedFrom, source: usedSource! } : null,
  };
}

// Attach scraped prices to each listing entry
async function enrichListingsWithPrices(
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

  if (country === 'JP' && model) {
    const [cs, gn] = await Promise.allSettled([
      scrapeCarSensorJP(make, model),
      scrapeGoonetJP(make, model),
    ]);
    return listings.map(l => {
      if (l.id === 'carsensor-jp' && cs.status === 'fulfilled')
        return { ...l, minPrice: cs.value.minPrice };
      if (l.id === 'goonet-jp'    && gn.status === 'fulfilled')
        return { ...l, minPrice: gn.value.minPrice };
      return l;
    });
  }

  if (country === 'NL' && model) {
    const mp = await scrapeMarktplaatsNL(make, model).catch(() => ({ minPrice: null, count: null }));
    return listings.map(l =>
      l.id === 'marktplaats-nl' ? { ...l, minPrice: mp.minPrice } : l,
    );
  }

  return listings;
}

export async function mediaRoute(app: FastifyInstance): Promise<void> {
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
    const cacheKey = `media:v7:${country}:${make}:${model ?? 'unknown'}:${year ?? 'any'}`.toLowerCase();

    const cached = await app.cache.get(cacheKey);
    if (cached) {
      const result = JSON.parse(cached);
      if (postcode) {
        result.listings = buildListings(make, model, year ?? null, country, postcode);
      }
      return reply.send(result);
    }

    const baseListings = buildListings(make, model, year ?? null, country, postcode);

    const [images, listings, prices] = await Promise.all([
      fetchCarImages(make, model, year ?? null),
      enrichListingsWithPrices(baseListings, make, model, year ?? null, country),
      buildPriceSummary(make, model, year ?? null, country),
    ]);

    const result = { images, listings, prices };

    await app.cache.set(cacheKey, JSON.stringify(result), 1800);
    return reply.send(result);
  });
}
