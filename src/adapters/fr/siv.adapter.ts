import { request } from 'undici';
import { IVehicleAdapter, AdapterResult } from '../adapter.interface';
import { SivResponseSchema } from '../../schemas/siv.schema';
import { config } from '../../config/env';
import {
  VehicleNotFoundError,
  UpstreamError,
  UpstreamRateLimitError,
} from '../../errors/app.errors';

// French fuel type labels → English
const FUEL_MAP: Record<string, string> = {
  'ESSENCE':          'Petrol',
  'GAZOLE':           'Diesel',
  'DIESEL':           'Diesel',
  'ELECTRIQUE':       'Electric',
  'HYBRIDE':          'Hybrid',
  'HYBRIDE ESSENCE':  'Petrol Hybrid',
  'HYBRIDE DIESEL':   'Diesel Hybrid',
  'GPL':              'LPG',
  'GNV':              'CNG',
  'HYDROGENE':        'Hydrogen',
  'PETROL':           'Petrol',
  'ELECTRIC':         'Electric',
};

function normalizePlate(plate: string): string {
  // SIV format: AB-123-CD → AB123CD (dashes removed, uppercase)
  return plate.replace(/[-\s]/g, '').toUpperCase();
}

function toNumber(val: string | number | undefined): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === 'number' ? val : parseInt(String(val), 10);
  return isNaN(n) ? null : n;
}

function toFloat(val: string | number | undefined): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(n) ? null : n;
}

export class SivAdapter implements IVehicleAdapter {
  readonly country = 'FR';

  async lookup(plate: string): Promise<AdapterResult> {
    if (!config.frPlate.apiKey) {
      throw new UpstreamError('SIV', undefined, 'FR_PLATE_API_KEY not configured');
    }

    const normalized = normalizePlate(plate);
    const data = await this.fetchPlate(normalized);

    const rawMake  = data.marque  ?? data.make  ?? data.constructeur ?? null;
    const rawModel = data.modele  ?? data.model  ?? data.denomination ?? null;
    const rawYear  = toNumber(data.annee ?? data.annee_premiere_immatriculation ?? data.year);
    const colour   = data.couleur ?? data.color ?? data.colour ?? null;
    const rawFuel  = (data.energie ?? data.carburant ?? data.fuel ?? '').toUpperCase();
    const fuelType = rawFuel ? (FUEL_MAP[rawFuel] ?? rawFuel) : null;

    return {
      plate:        normalized,
      country:      this.country,
      rawMake:      rawMake  ?? null,
      rawModel:     rawModel ?? null,
      rawYear,
      colour:       colour   ?? null,
      fuelType:     fuelType || null,
      engineSize:   toNumber(data.cylindree  ?? data.engine_size),
      co2Emissions: toFloat(data.co2        ?? data.co2_emissions),
    };
  }

  private async fetchPlate(plate: string) {
    let statusCode: number;
    let body: unknown;

    try {
      const url = new URL(config.frPlate.apiUrl);
      url.searchParams.set('immatriculation', plate);

      const res = await request(url.toString(), {
        method: 'GET',
        headers: {
          'x-rapidapi-key':  config.frPlate.apiKey,
          'x-rapidapi-host': config.frPlate.rapidApiHost,
          'Accept':          'application/json',
        },
        bodyTimeout:    config.httpTimeoutMs,
        headersTimeout: config.httpTimeoutMs,
      });

      statusCode = res.statusCode;
      body = await res.body.json();
    } catch (err) {
      throw new UpstreamError('SIV', undefined, (err as Error).message);
    }

    if (statusCode === 404) throw new VehicleNotFoundError(plate, this.country);
    if (statusCode === 429) throw new UpstreamRateLimitError('SIV');
    if (statusCode !== 200) throw new UpstreamError('SIV', statusCode);

    const parsed = SivResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new UpstreamError('SIV', 200, `Unexpected response shape: ${parsed.error.message}`);
    }

    if (!parsed.data.marque && !parsed.data.make && !parsed.data.constructeur) {
      throw new VehicleNotFoundError(plate, this.country);
    }

    return parsed.data;
  }
}
