import { request } from 'undici';
import { IVehicleAdapter, AdapterResult } from '../adapter.interface';
import { DvlaResponseSchema } from '../../schemas/dvla.schema';
import { config } from '../../config/env';
import {
  VehicleNotFoundError,
  UpstreamError,
  UpstreamRateLimitError,
} from '../../errors/app.errors';

export class DvlaAdapter implements IVehicleAdapter {
  readonly country = 'GB';

  async lookup(plate: string): Promise<AdapterResult> {
    if (config.dvla.apiKey === 'PENDING') {
      throw new UpstreamError('DVLA', undefined, 'DVLA API key not configured yet (application pending)');
    }

    let statusCode: number;
    let body: unknown;

    try {
      const response = await request(config.dvla.apiUrl, {
        method: 'POST',
        headers: {
          'x-api-key': config.dvla.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ registrationNumber: plate }),
        bodyTimeout: config.httpTimeoutMs,
        headersTimeout: config.httpTimeoutMs,
      });

      statusCode = response.statusCode;
      body = await response.body.json();
    } catch (err) {
      throw new UpstreamError('DVLA', undefined, (err as Error).message);
    }

    if (statusCode === 404) {
      throw new VehicleNotFoundError(plate, this.country);
    }
    if (statusCode === 429) {
      throw new UpstreamRateLimitError('DVLA');
    }
    if (statusCode !== 200) {
      throw new UpstreamError('DVLA', statusCode);
    }

    const parsed = DvlaResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new UpstreamError('DVLA', 200, `Unexpected response shape: ${parsed.error.message}`);
    }

    const data = parsed.data;
    return {
      plate: data.registrationNumber,
      country: this.country,
      rawMake: data.make ?? null,
      rawModel: null, // DVLA does not provide model
      rawYear: data.yearOfManufacture ?? null,
      colour: data.colour ?? null,
      fuelType: data.fuelType ?? null,
      engineSize: data.engineCapacity ?? null,
      co2Emissions: data.co2Emissions ?? null,
    };
  }
}
