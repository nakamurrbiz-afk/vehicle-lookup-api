import { AdapterResult } from '../adapters/adapter.interface';

// Sample vehicle data for development/demo use.
// Key format: "COUNTRY:PLATE" (both uppercase, spaces removed)
const SAMPLES: Record<string, AdapterResult> = {
  'GB:AB12CDE': {
    plate: 'AB12CDE',
    country: 'GB',
    rawMake: 'TOYOTA',
    rawModel: 'ALPHARD',
    rawYear: 2024,
    colour: 'Pearl White',
    fuelType: 'Petrol',
    engineSize: 2487,
    vin: 'JTJBARBZ4P2123456',
  },
};

export function findSample(plate: string, country: string): AdapterResult | null {
  const key = `${country.toUpperCase()}:${plate.toUpperCase().replace(/[\s\-]/g, '')}`;
  return SAMPLES[key] ?? null;
}
