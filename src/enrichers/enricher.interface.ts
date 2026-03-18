import { AdapterResult } from '../adapters/adapter.interface';

export interface IVehicleEnricher {
  readonly country: string;
  enrich(result: AdapterResult): Promise<AdapterResult>;
}
