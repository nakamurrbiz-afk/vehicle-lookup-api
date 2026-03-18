import { AdapterResult } from '../adapters/adapter.interface';
import { VehicleResponse } from '../schemas/lookup.schema';
import { getRunningCost } from '../services/running-cost.service';
import { getEuroNcapRating } from '../services/euronmap.service';
import { getInsuranceGroup } from '../services/insurance-group.service';

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

const SOURCE_MAP: Record<string, string> = {
  GB: 'dvla',
  US: 'nhtsa',
};

export function normalize(
  raw: AdapterResult,
  cachedAt: string | null = null,
  popularityCount = 1,
): VehicleResponse {
  return {
    plate:           raw.plate,
    country:         raw.country,
    make:            raw.rawMake ? titleCase(raw.rawMake) : null,
    model:           raw.rawModel ? titleCase(raw.rawModel) : null,
    year:            raw.rawYear ?? null,
    colour:          raw.colour ? titleCase(raw.colour) : null,
    fuelType:        raw.fuelType ? titleCase(raw.fuelType) : null,
    vin:             raw.vin ?? null,
    engineSize:      raw.engineSize ?? null,
    co2Emissions:    raw.co2Emissions ?? null,
    mileageHistory:  raw.mileageHistory ?? [],
    commonFailures:  raw.commonFailures ?? [],
    runningCost:     getRunningCost(raw.fuelType),
    euroncapStars:   getEuroNcapRating(raw.rawMake),
    insuranceGroup:  getInsuranceGroup(raw.rawMake),
    popularityCount,
    source:          SOURCE_MAP[raw.country.toUpperCase()] ?? 'unknown',
    cachedAt,
  };
}
