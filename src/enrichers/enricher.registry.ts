import { AdapterResult } from '../adapters/adapter.interface';
import { IVehicleEnricher } from './enricher.interface';
import { DvsaMotEnricher } from './uk/dvsa-mot.enricher';
import { NhtsaSafetyEnricher } from './us/nhtsa-safety.enricher';

class EnricherRegistry {
  private readonly enrichers = new Map<string, IVehicleEnricher[]>();

  constructor() {
    this.register(new DvsaMotEnricher());
    this.register(new NhtsaSafetyEnricher());
  }

  register(enricher: IVehicleEnricher): void {
    const key = enricher.country.toUpperCase();
    const list = this.enrichers.get(key) ?? [];
    list.push(enricher);
    this.enrichers.set(key, list);
  }

  async enrich(country: string, result: AdapterResult): Promise<AdapterResult> {
    const list = this.enrichers.get(country.toUpperCase()) ?? [];
    let current = result;
    for (const enricher of list) {
      current = await enricher.enrich(current);
    }
    return current;
  }
}

// Singleton — enrichers are stateless per-request, safe to share
export const enricherRegistry = new EnricherRegistry();
