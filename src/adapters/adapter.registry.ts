import { IVehicleAdapter } from './adapter.interface';
import { DvlaAdapter } from './uk/dvla.adapter';
import { PlateToVinAdapter } from './us/plate-to-vin.adapter';
import { RdwAdapter } from './nl/rdw.adapter';
import { SivAdapter } from './fr/siv.adapter';
import { UnsupportedCountryError } from '../errors/app.errors';
import { config } from '../config/env';

class AdapterRegistry {
  private readonly adapters = new Map<string, IVehicleAdapter>();

  constructor() {
    this.register(new DvlaAdapter());
    this.register(new PlateToVinAdapter());
    this.register(new RdwAdapter());
    // FRは有料キー(FR_PLATE_API_KEY)必須。未設定なら登録せず「未対応国」(400)として扱う
    // （登録したまま502を返すより誠実。キーを設定すれば自動で復帰する）
    if (config.frPlate.apiKey) {
      this.register(new SivAdapter());
    }
  }

  register(adapter: IVehicleAdapter): void {
    this.adapters.set(adapter.country.toUpperCase(), adapter);
  }

  get(countryCode: string): IVehicleAdapter {
    const adapter = this.adapters.get(countryCode.toUpperCase());
    if (!adapter) {
      throw new UnsupportedCountryError(countryCode, this.supportedCountries());
    }
    return adapter;
  }

  supportedCountries(): string[] {
    return Array.from(this.adapters.keys());
  }
}

// Singleton — adapters are stateless per-request, safe to share
export const adapterRegistry = new AdapterRegistry();
