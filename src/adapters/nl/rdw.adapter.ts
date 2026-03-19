import { request } from 'undici';
import { IVehicleAdapter, AdapterResult } from '../adapter.interface';
import { RdwVehicleArraySchema, RdwFuelArraySchema } from '../../schemas/rdw.schema';
import { VehicleNotFoundError, UpstreamError } from '../../errors/app.errors';
import { config } from '../../config/env';

const RDW_BASE = 'https://opendata.rdw.nl/resource';

// Dutch fuel type labels → English
const FUEL_MAP: Record<string, string> = {
  'BENZINE':                  'Petrol',
  'DIESEL':                   'Diesel',
  'ELEKTRICITEIT':            'Electric',
  'LPG':                      'LPG',
  'WATERSTOF':                'Hydrogen',
  'HYBRIDE (BENZINE/ELEK)':   'Petrol Hybrid',
  'HYBRIDE (DIESEL/ELEK)':    'Diesel Hybrid',
  'PLUG-IN HYBRIDE (BENZINE)':'Plug-in Petrol Hybrid',
  'PLUG-IN HYBRIDE (DIESEL)': 'Plug-in Diesel Hybrid',
  'CNG':                      'CNG',
  'LNG':                      'LNG',
};

function normalizePlate(plate: string): string {
  return plate.replace(/[-\s]/g, '').toUpperCase();
}

export class RdwAdapter implements IVehicleAdapter {
  readonly country = 'NL';

  async lookup(plate: string): Promise<AdapterResult> {
    const normalized = normalizePlate(plate);

    const [vehicleRes, fuelRes] = await Promise.allSettled([
      this.fetchVehicle(normalized),
      this.fetchFuel(normalized),
    ]);

    if (vehicleRes.status === 'rejected') throw vehicleRes.reason;

    const vehicle = vehicleRes.value;
    const fuel    = fuelRes.status === 'fulfilled' ? fuelRes.value : null;

    const rawFuel = fuel?.brandstof_omschrijving?.toUpperCase() ?? null;
    const fuelType = rawFuel
      ? (FUEL_MAP[rawFuel] ?? rawFuel)
      : null;

    return {
      plate:        normalized,
      country:      this.country,
      rawMake:      vehicle.merk            ?? null,
      rawModel:     vehicle.handelsbenaming  ?? null,
      rawYear:      vehicle.bouwjaar ? parseInt(vehicle.bouwjaar, 10) : null,
      colour:       vehicle.eerste_kleur     ?? null,
      fuelType,
      engineSize:   vehicle.cilinderinhoud ? parseInt(vehicle.cilinderinhoud, 10) : null,
      co2Emissions: fuel?.co2_uitstoot_gecombineerd
        ? parseFloat(fuel.co2_uitstoot_gecombineerd)
        : null,
    };
  }

  private async fetchVehicle(plate: string) {
    const url = `${RDW_BASE}/m9d7-ebf2.json?kenteken=${plate}&$limit=1`;
    let body: unknown;
    try {
      const res = await request(url, {
        bodyTimeout:   config.httpTimeoutMs,
        headersTimeout: config.httpTimeoutMs,
      });
      body = await res.body.json();
    } catch (err) {
      throw new UpstreamError('RDW', undefined, (err as Error).message);
    }

    const parsed = RdwVehicleArraySchema.safeParse(body);
    if (!parsed.success) {
      throw new UpstreamError('RDW', 200, `Unexpected response shape: ${parsed.error.message}`);
    }
    if (parsed.data.length === 0) {
      throw new VehicleNotFoundError(plate, 'NL');
    }
    return parsed.data[0];
  }

  private async fetchFuel(plate: string) {
    const url = `${RDW_BASE}/8ys7-d773.json?kenteken=${plate}&$limit=1`;
    try {
      const res = await request(url, {
        bodyTimeout:    config.httpTimeoutMs,
        headersTimeout: config.httpTimeoutMs,
      });
      const body = await res.body.json();
      const parsed = RdwFuelArraySchema.safeParse(body);
      if (!parsed.success || parsed.data.length === 0) return null;
      return parsed.data[0];
    } catch {
      return null; // Non-critical — graceful degradation
    }
  }
}
