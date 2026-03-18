import { request } from 'undici';
import { z } from 'zod';
import { IVehicleAdapter, AdapterResult } from '../adapter.interface';
import { decodeVin } from './nhtsa.client';
import { config } from '../../config/env';
import {
  VehicleNotFoundError,
  UpstreamError,
  UpstreamRateLimitError,
} from '../../errors/app.errors';

// vehicle-plate-to-vin RapidAPI response schema
// API: https://rapidapi.com/jgentes/api/vehicle-plate-to-vin
const PlateToVinResponseSchema = z.object({
  vin: z.string(),
  state: z.string().optional(),
});

export class PlateToVinAdapter implements IVehicleAdapter {
  readonly country = 'US';

  async lookup(plate: string, state?: string): Promise<AdapterResult> {
    if (config.plateToVin.apiKey === 'PENDING') {
      throw new UpstreamError('PlateToVin', undefined, 'US Plate-to-VIN API key not configured');
    }

    const vin = await this.resolveVin(plate, state);
    const vehicleData = await decodeVin(vin);

    if (!vehicleData.make && !vehicleData.model && !vehicleData.year) {
      throw new VehicleNotFoundError(plate, this.country);
    }

    return {
      plate,
      country: this.country,
      rawMake:  vehicleData.make,
      rawModel: vehicleData.model,
      rawYear:  vehicleData.year,
      fuelType: vehicleData.fuelType,
      vin,
    };
  }

  private async resolveVin(plate: string, state?: string): Promise<string> {
    let statusCode: number;
    let body: unknown;

    try {
      const url = new URL(config.plateToVin.apiUrl);
      url.searchParams.set('plate', plate);
      if (state) url.searchParams.set('state', state);

      const response = await request(url.toString(), {
        method: 'GET',
        headers: {
          'x-rapidapi-key':  config.plateToVin.apiKey,
          'x-rapidapi-host': config.plateToVin.rapidApiHost,
          'Accept':          'application/json',
        },
        bodyTimeout:    config.httpTimeoutMs,
        headersTimeout: config.httpTimeoutMs,
      });

      statusCode = response.statusCode;
      body = await response.body.json();
    } catch (err) {
      throw new UpstreamError('PlateToVin', undefined, (err as Error).message);
    }

    if (statusCode === 404) throw new VehicleNotFoundError(plate, this.country);
    if (statusCode === 429) throw new UpstreamRateLimitError('PlateToVin');
    if (statusCode !== 200) throw new UpstreamError('PlateToVin', statusCode);

    const parsed = PlateToVinResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new UpstreamError('PlateToVin', 200, `Unexpected response shape: ${parsed.error.message}`);
    }

    return parsed.data.vin;
  }
}
