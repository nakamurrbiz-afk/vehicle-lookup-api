import { IVehicleAdapter } from './adapter.interface';
import { DvlaAdapter } from './uk/dvla.adapter';
import { PlateToVinAdapter } from './us/plate-to-vin.adapter';
import { RdwAdapter } from './nl/rdw.adapter';
import { UnsupportedCountryError } from '../errors/app.errors';

class AdapterRegistry {
  private readonly adapters = new Map<string, IVehicleAdapter>();

  constructor() {
    this.register(new DvlaAdapter());
    this.register(new PlateToVinAdapter());
    this.register(new RdwAdapter());
  }

  register(adapter: IVehicleAdapter): void {
    this.adapters.set(adapter.country.toUpperCase(), adapter);
  }

  get(countryCode: string): IVehicleAdapter {
    const adapter = this.adapters.get(countryCode.toUpperCase());
    if (!adapter) {
      throw new UnsupportedCountryError(countryCode);
    }
    return adapter;
  }

  supportedCountries(): string[] {
    return Array.from(this.adapters.keys());
  }
}

// Singleton — adapters are stateless per-request, safe to share
export const adapterRegistry = new AdapterRegistry();
