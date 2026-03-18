import { request } from 'undici';
import { z } from 'zod';
import { IVehicleEnricher } from '../enricher.interface';
import { AdapterResult } from '../../adapters/adapter.interface';
import { config } from '../../config/env';

const DvsaVehicleSchema = z.object({
  registration: z.string(),
  make: z.string().optional(),
  model: z.string().optional(),
  primaryColour: z.string().optional(),
  fuelType: z.string().optional(),
  firstUsedDate: z.string().optional(),
  motTests: z.array(z.unknown()).optional(),
});

const DvsaResponseSchema = z.array(DvsaVehicleSchema);

export class DvsaMotEnricher implements IVehicleEnricher {
  readonly country = 'GB';

  async enrich(result: AdapterResult): Promise<AdapterResult> {
    // Skip if model is already known
    if (result.rawModel !== null) return result;

    if (config.dvsaMot.apiKey === 'PENDING') return result;

    try {
      const response = await request(
        `${config.dvsaMot.apiUrl}?registration=${encodeURIComponent(result.plate)}`,
        {
          method: 'GET',
          headers: {
            'x-api-key': config.dvsaMot.apiKey,
            'Accept': 'application/json+v6',
          },
          bodyTimeout: config.httpTimeoutMs,
          headersTimeout: config.httpTimeoutMs,
        },
      );

      if (response.statusCode !== 200) return result;

      const body = await response.body.json();
      const parsed = DvsaResponseSchema.safeParse(body);
      if (!parsed.success || parsed.data.length === 0) return result;

      const vehicle = parsed.data[0];

      return {
        ...result,
        rawModel: vehicle.model ?? result.rawModel,
        // Prefer DVSA colour if DVLA did not provide one
        colour: result.colour ?? vehicle.primaryColour ?? null,
      };
    } catch {
      // Enrichment is best-effort — never fail the primary lookup
      return result;
    }
  }
}
