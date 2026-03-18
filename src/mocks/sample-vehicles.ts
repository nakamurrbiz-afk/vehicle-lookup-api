import { AdapterResult } from '../adapters/adapter.interface';

// Sample vehicle data sourced from live DVLA API responses.
// Key format: "COUNTRY:PLATE" (both uppercase, spaces removed)
const SAMPLES: Record<string, AdapterResult> = {
  // ── UK — real DVLA data ─────────────────────────────────────────────
  // Tesla (Electric)
  'GB:LD70AXK': {
    plate: 'LD70AXK',
    country: 'GB',
    rawMake: 'TESLA',
    rawModel: null,
    rawYear: 2020,
    colour: 'GREY',
    fuelType: 'ELECTRICITY',
    engineSize: 0,
    vin: null,
  },
  // BMW (Hybrid Electric)
  'GB:BK22FTX': {
    plate: 'BK22FTX',
    country: 'GB',
    rawMake: 'BMW',
    rawModel: null,
    rawYear: 2022,
    colour: 'WHITE',
    fuelType: 'HYBRID ELECTRIC',
    engineSize: 2998,
    vin: null,
  },
  // Volkswagen (Petrol, 2018)
  'GB:SG18HTN': {
    plate: 'SG18HTN',
    country: 'GB',
    rawMake: 'VOLKSWAGEN',
    rawModel: null,
    rawYear: 2018,
    colour: 'WHITE',
    fuelType: 'PETROL',
    engineSize: 1498,
    vin: null,
  },
  // Volkswagen (Petrol, 2020)
  'GB:BV20OUU': {
    plate: 'BV20OUU',
    country: 'GB',
    rawMake: 'VOLKSWAGEN',
    rawModel: null,
    rawYear: 2020,
    colour: 'BLUE',
    fuelType: 'PETROL',
    engineSize: 999,
    vin: null,
  },
  // Ford (Petrol, 2017)
  'GB:SY17UXJ': {
    plate: 'SY17UXJ',
    country: 'GB',
    rawMake: 'FORD',
    rawModel: null,
    rawYear: 2017,
    colour: 'GREY',
    fuelType: 'PETROL',
    engineSize: 998,
    vin: null,
  },
  // BMW (Diesel, 2014)
  'GB:YE14OPB': {
    plate: 'YE14OPB',
    country: 'GB',
    rawMake: 'BMW',
    rawModel: null,
    rawYear: 2014,
    colour: 'BLACK',
    fuelType: 'DIESEL',
    engineSize: 1995,
    vin: null,
  },
};

export function findSample(plate: string, country: string): AdapterResult | null {
  const key = `${country.toUpperCase()}:${plate.toUpperCase().replace(/[\s\-]/g, '')}`;
  return SAMPLES[key] ?? null;
}
