import { request } from 'undici';
import { z } from 'zod';
import { IVehicleEnricher } from '../enricher.interface';
import { AdapterResult } from '../../adapters/adapter.interface';
import { config } from '../../config/env';

// NHTSA Complaints API
const ComplaintsResponseSchema = z.object({
  count: z.number().optional(),
  results: z.array(z.any()).optional(),
});

// NHTSA Recalls API
const RecallsResponseSchema = z.object({
  Count: z.number().optional(),
  results: z.array(z.any()).optional(),
});

// NHTSA Safety Ratings (NCSA) API
const SafetyRatingSchema = z.object({
  OverallStarRating: z.union([z.number(), z.string()]).optional(),
});
const SafetyRatingsResponseSchema = z.object({
  Count: z.number().optional(),
  Results: z.array(SafetyRatingSchema).optional(),
});

async function fetchJson(url: string): Promise<unknown> {
  const res = await request(url, {
    method:         'GET',
    bodyTimeout:    config.httpTimeoutMs,
    headersTimeout: config.httpTimeoutMs,
  });
  if (res.statusCode !== 200) return null;
  return res.body.json().catch(() => null);
}

export class NhtsaSafetyEnricher implements IVehicleEnricher {
  readonly country = 'US';

  async enrich(result: AdapterResult): Promise<AdapterResult> {
    if (!result.vin && (!result.rawMake || !result.rawYear)) return result;

    try {
      const [recallCount, safetyRating] = await Promise.all([
        this.fetchRecallCount(result),
        this.fetchSafetyRating(result),
      ]);

      return {
        ...result,
        recallCount:       recallCount,
        nhtsaSafetyRating: safetyRating,
      };
    } catch (err) {
      console.warn(`[NHTSA-Safety] enrichment failed for ${result.plate}:`, (err as Error).message);
      return result;
    }
  }

  private async fetchRecallCount(result: AdapterResult): Promise<number | null> {
    if (!result.rawMake || !result.rawYear || !result.rawModel) return null;

    const make  = encodeURIComponent(result.rawMake);
    const model = encodeURIComponent(result.rawModel);
    const year  = result.rawYear;

    const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${make}&model=${model}&modelYear=${year}`;
    const body = await fetchJson(url);
    const parsed = RecallsResponseSchema.safeParse(body);
    if (!parsed.success) return null;

    return parsed.data.Count ?? (parsed.data.results?.length ?? null);
  }

  private async fetchSafetyRating(result: AdapterResult): Promise<number | null> {
    if (!result.rawMake || !result.rawYear || !result.rawModel) return null;

    const make  = encodeURIComponent(result.rawMake);
    const model = encodeURIComponent(result.rawModel);
    const year  = result.rawYear;

    // Get vehicle ID list first
    const idUrl  = `https://api.nhtsa.gov/SafetyRatings/modelyear/${year}/make/${make}/model/${model}`;
    const idBody = await fetchJson(idUrl);
    const idParsed = z.object({ Results: z.array(z.object({ VehicleId: z.number() })) }).safeParse(idBody);
    if (!idParsed.success || idParsed.data.Results.length === 0) return null;

    const vehicleId = idParsed.data.Results[0].VehicleId;
    const ratingUrl = `https://api.nhtsa.gov/SafetyRatings/VehicleId/${vehicleId}`;
    const ratingBody = await fetchJson(ratingUrl);
    const ratingParsed = SafetyRatingsResponseSchema.safeParse(ratingBody);
    if (!ratingParsed.success || !ratingParsed.data.Results?.length) return null;

    const raw = ratingParsed.data.Results[0].OverallStarRating;
    if (raw === undefined || raw === null) return null;
    const stars = typeof raw === 'string' ? parseInt(raw, 10) : raw;
    return isNaN(stars) || stars <= 0 ? null : stars;
  }
}
