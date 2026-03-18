export interface MileageRecord {
  date: string;    // ISO date string
  mileage: number;
  passed: boolean;
}

export interface AdapterResult {
  plate: string;
  country: string;
  rawMake: string | null;
  rawModel: string | null;
  rawYear: number | null;
  colour?: string | null;
  fuelType?: string | null;
  vin?: string | null;
  engineSize?: number | null;
  co2Emissions?: number | null;
  mileageHistory?: MileageRecord[];
  commonFailures?: string[];
}

export interface IVehicleAdapter {
  readonly country: string;
  lookup(plate: string): Promise<AdapterResult>;
}
