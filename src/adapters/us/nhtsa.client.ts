import { request } from 'undici';
import { NhtsaResponseSchema } from '../../schemas/nhtsa.schema';
import { config } from '../../config/env';
import { UpstreamError } from '../../errors/app.errors';

export interface NhtsaVehicleData {
  make: string | null;
  model: string | null;
  year: number | null;
  fuelType: string | null;
}

export async function decodeVin(vin: string): Promise<NhtsaVehicleData> {
  const url = `${config.nhtsaApiUrl}/DecodeVinValues/${encodeURIComponent(vin)}?format=json`;

  let statusCode: number;
  let body: unknown;

  try {
    const response = await request(url, {
      method: 'GET',
      bodyTimeout: config.httpTimeoutMs,
      headersTimeout: config.httpTimeoutMs,
    });
    statusCode = response.statusCode;
    body = await response.body.json();
  } catch (err) {
    throw new UpstreamError('NHTSA', undefined, (err as Error).message);
  }

  if (statusCode !== 200) {
    throw new UpstreamError('NHTSA', statusCode);
  }

  const parsed = NhtsaResponseSchema.safeParse(body);
  if (!parsed.success || parsed.data.Results.length === 0) {
    throw new UpstreamError('NHTSA', 200, 'Unexpected response shape');
  }

  const result = parsed.data.Results[0];

  // ErrorCode "8" = No data / VIN not found; "0" = success
  if (result.ErrorCode && !['0', ''].includes(result.ErrorCode)) {
    return { make: null, model: null, year: null, fuelType: null };
  }

  const year = result.ModelYear ? parseInt(result.ModelYear, 10) : null;

  return {
    make: result.Make || null,
    model: result.Model || null,
    year: isNaN(year as number) ? null : year,
    fuelType: result.FuelTypePrimary || null,
  };
}
