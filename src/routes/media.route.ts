import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { fetchCarImages } from '../services/car-image.service';
import { buildListings, ListingLink } from '../services/listings.service';
import { getNewCarPrice } from '../services/new-car-price.service';
import {
  scrapeAutoTraderUK,
  scrapeMotorsUK,
  scrapeCarGurusUK,
  scrapeCarGurusUS,
  scrapeAutoTraderUS,
  scrapeCarSensorJP,
  scrapeGoonetJP,
  scrapeMarktplaatsNL,
  scrapeLeBonCoinFR,
  scrapeLaCentraleFR,
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

interface ScrapedData {
  prices:   PriceSummary;
  listings: ListingLink[];
}

/**
 * Scrape prices once and use results for both the price summary card
 * and the per-listing minPrice badges — avoids fetching the same URLs twice.
 */
async function scrapeAndBuild(
  baseListings: ListingLink[],
  make: string,
  model: string | null,
  year: number | null,
  country: string,
): Promise<ScrapedData> {
  const newPrice = getNewCarPrice(make, model);
  const newSummary = newPrice
    ? { from: newPrice.from, to: newPrice.to, note: newPrice.note, source: newPrice.source }
    : null;

  if (country === 'GB' && model) {
    const yearFrom = year ? year - 2 : undefined;
    const [at, mo, cg] = await Promise.allSettled([
      scrapeAutoTraderUK(make, model, yearFrom),
      scrapeMotorsUK(make, model),
      scrapeCarGurusUK(make, model),
    ]);
    const atVal = at.status === 'fulfilled' ? at.value : null;
    const moVal = mo.status === 'fulfilled' ? mo.value : null;
    const cgVal = cg.status === 'fulfilled' ? cg.value : null;

    const best = atVal?.minPrice
      ? { from: atVal.minPrice, source: 'AutoTrader UK' }
      : moVal?.minPrice
        ? { from: moVal.minPrice, source: 'Motors.co.uk' }
        : cgVal?.minPrice
          ? { from: cgVal.minPrice, source: 'CarGurus UK' }
          : null;

    return {
      prices: { new: newSummary, used: best },
      listings: baseListings.map(l => {
        if (l.id === 'autotrader-uk' && atVal) return { ...l, minPrice: atVal.minPrice };
        if (l.id === 'motors-uk'    && moVal) return { ...l, minPrice: moVal.minPrice };
        if (l.id === 'cargurus-uk'  && cgVal) return { ...l, minPrice: cgVal.minPrice };
        return l;
      }),
    };
  }

  if (country === 'US' && model) {
    const [cg, at] = await Promise.allSettled([
      scrapeCarGurusUS(make, model),
      scrapeAutoTraderUS(make, model),
    ]);
    const cgVal = cg.status === 'fulfilled' ? cg.value : null;
    const atVal = at.status === 'fulfilled' ? at.value : null;

    const usedFrom = cgVal?.minPrice ?? atVal?.minPrice ?? null;
    const used = usedFrom ? { from: usedFrom, source: 'CarGurus / AutoTrader US' } : null;

    return {
      prices: { new: newSummary, used },
      listings: baseListings.map(l => {
        if (l.id === 'cargurus-us'   && cgVal) return { ...l, minPrice: cgVal.minPrice };
        if (l.id === 'autotrader-us' && atVal) return { ...l, minPrice: atVal.minPrice };
        return l;
      }),
    };
  }

  if (country === 'JP' && model) {
    const [cs, gn] = await Promise.allSettled([
      scrapeCarSensorJP(make, model),
      scrapeGoonetJP(make, model),
    ]);
    const csVal = cs.status === 'fulfilled' ? cs.value : null;
    const gnVal = gn.status === 'fulfilled' ? gn.value : null;

    const usedFrom = csVal?.minPrice ?? gnVal?.minPrice ?? null;
    const used = usedFrom ? { from: usedFrom, source: 'CarSensor / Goo-net' } : null;

    return {
      prices: { new: newSummary, used },
      listings: baseListings.map(l => {
        if (l.id === 'carsensor-jp' && csVal) return { ...l, minPrice: csVal.minPrice };
        if (l.id === 'goonet-jp'    && gnVal) return { ...l, minPrice: gnVal.minPrice };
        return l;
      }),
    };
  }

  if (country === 'NL' && model) {
    const mp = await scrapeMarktplaatsNL(make, model).catch(() => ({ minPrice: null, count: null }));
    const used = mp.minPrice ? { from: mp.minPrice, source: 'Marktplaats' } : null;

    return {
      prices: { new: newSummary, used },
      listings: baseListings.map(l =>
        l.id === 'marktplaats-nl' ? { ...l, minPrice: mp.minPrice } : l,
      ),
    };
  }

  if (country === 'FR' && model) {
    const [lbc, lc] = await Promise.allSettled([
      scrapeLeBonCoinFR(make, model),
      scrapeLaCentraleFR(make, model),
    ]);
    const lbcVal = lbc.status === 'fulfilled' ? lbc.value : null;
    const lcVal  = lc.status  === 'fulfilled' ? lc.value  : null;

    const usedFrom = lbcVal?.minPrice ?? lcVal?.minPrice ?? null;
    const usedSource = lbcVal?.minPrice ? 'LeBonCoin' : 'La Centrale';
    const used = usedFrom ? { from: usedFrom, source: usedSource } : null;

    return {
      prices: { new: newSummary, used },
      listings: baseListings.map(l => {
        if (l.id === 'leboncoin-fr'  && lbcVal) return { ...l, minPrice: lbcVal.minPrice };
        if (l.id === 'lacentrale-fr' && lcVal)  return { ...l, minPrice: lcVal.minPrice };
        return l;
      }),
    };
  }

  return {
    prices:   { new: newSummary, used: null },
    listings: baseListings,
  };
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
    const cacheKey = `media:v8:${country}:${make}:${model ?? 'unknown'}:${year ?? 'any'}`.toLowerCase();

    const cached = await app.cache.get(cacheKey);
    if (cached) {
      const result = JSON.parse(cached);
      if (postcode) {
        result.listings = buildListings(make, model, year ?? null, country, postcode);
      }
      return reply.send(result);
    }

    const baseListings = buildListings(make, model, year ?? null, country, postcode);

    const [images, scraped] = await Promise.all([
      fetchCarImages(make, model, year ?? null),
      scrapeAndBuild(baseListings, make, model, year ?? null, country),
    ]);

    const result = { images, listings: scraped.listings, prices: scraped.prices };

    await app.cache.set(cacheKey, JSON.stringify(result), 1800);
    return reply.send(result);
  });
}
