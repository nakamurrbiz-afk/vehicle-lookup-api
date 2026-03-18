import { request } from 'undici';
import { z } from 'zod';
import { IVehicleEnricher } from '../enricher.interface';
import { AdapterResult, MileageRecord } from '../../adapters/adapter.interface';
import { config } from '../../config/env';

// ── OAuth2 token cache ────────────────────────────────────────────────────

interface TokenCache {
  token:     string;
  expiresAt: number; // ms epoch
}

let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - now > 60_000) {
    return tokenCache.token;
  }

  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     config.dvsaMot.clientId,
    client_secret: config.dvsaMot.clientSecret,
    scope:         config.dvsaMot.scope,
  });

  const res = await request(config.dvsaMot.tokenUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
    bodyTimeout:    10_000,
    headersTimeout: 10_000,
  });

  const data = await res.body.json() as { access_token: string; expires_in: number };
  tokenCache = {
    token:     data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return tokenCache.token;
}

// ── Zod schemas ───────────────────────────────────────────────────────────

const DefectSchema = z.object({
  text:      z.string(),
  type:      z.enum(['ADVISORY', 'PRS', 'MAJOR', 'MINOR', 'DANGEROUS']),
  dangerous: z.boolean().optional(),
});

const MotTestSchema = z.object({
  completedDate:  z.string().optional(),
  testResult:     z.string().optional(),
  odometerValue:  z.string().optional(),
  odometerUnit:   z.string().optional(),
  defects:        z.array(DefectSchema).optional(),
});

const DvsaVehicleSchema = z.object({
  registration:   z.string(),
  make:           z.string().optional(),
  model:          z.string().optional(),
  primaryColour:  z.string().optional(),
  fuelType:       z.string().optional(),
  firstUsedDate:  z.string().optional(),
  motTests:       z.array(MotTestSchema).optional(),
});

// New API returns a single object, old returned an array — handle both
const DvsaResponseSchema = z.union([
  DvsaVehicleSchema,
  z.array(DvsaVehicleSchema).transform(arr => arr[0]),
]);

// ── Helpers ───────────────────────────────────────────────────────────────

function extractMileageHistory(motTests: z.infer<typeof MotTestSchema>[]): MileageRecord[] {
  return motTests
    .filter(t => t.odometerValue && t.completedDate)
    .map(t => ({
      date:    t.completedDate!.split('T')[0],
      mileage: parseInt(t.odometerValue!, 10),
      passed:  t.testResult?.toUpperCase() === 'PASSED',
    }))
    .filter(r => !isNaN(r.mileage))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function extractCommonFailures(motTests: z.infer<typeof MotTestSchema>[]): string[] {
  const freq = new Map<string, number>();
  for (const test of motTests) {
    for (const defect of test.defects ?? []) {
      if (defect.type === 'MAJOR' || defect.type === 'DANGEROUS' || defect.type === 'PRS') {
        const key = defect.text.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
        freq.set(key, (freq.get(key) ?? 0) + 1);
      }
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([text]) => text.charAt(0).toUpperCase() + text.slice(1));
}

// Clean up model string: remove redundant make prefix e.g. "BMW X5 XDRIVE45E" → "X5 Xdrive45e"
function normaliseModel(make: string | undefined, model: string): string {
  let m = model.trim();
  if (make) {
    const makeUpper = make.toUpperCase();
    if (m.toUpperCase().startsWith(makeUpper + ' ')) {
      m = m.slice(make.length + 1).trim();
    }
  }
  // Title-case
  return m.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// ── Enricher ──────────────────────────────────────────────────────────────

export class DvsaMotEnricher implements IVehicleEnricher {
  readonly country = 'GB';

  async enrich(result: AdapterResult): Promise<AdapterResult> {
    if (!config.dvsaMot.clientId || !config.dvsaMot.clientSecret) return result;
    if (config.dvsaMot.apiKey === 'PENDING') return result;

    try {
      const token = await getAccessToken();

      const response = await request(
        `${config.dvsaMot.apiUrl}/${encodeURIComponent(result.plate)}`,
        {
          method:  'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-API-Key':     config.dvsaMot.apiKey,
            'Accept':        'application/json+v6',
          },
          bodyTimeout:    config.httpTimeoutMs,
          headersTimeout: config.httpTimeoutMs,
        },
      );

      if (response.statusCode !== 200) {
        const errBody = await response.body.text().catch(() => '');
        console.warn(`[DVSA] ${response.statusCode} for ${result.plate}: ${errBody}`);
        return result;
      }

      const body  = await response.body.json();
      const parsed = DvsaResponseSchema.safeParse(body);
      if (!parsed.success) return result;

      const vehicle  = parsed.data;
      const motTests = vehicle.motTests ?? [];

      return {
        ...result,
        rawModel:       result.rawModel ?? (vehicle.model ? normaliseModel(vehicle.make, vehicle.model) : null),
        colour:         result.colour   ?? vehicle.primaryColour ?? null,
        mileageHistory: extractMileageHistory(motTests),
        commonFailures: extractCommonFailures(motTests),
      };
    } catch (err) {
      console.warn(`[DVSA] enrichment failed for ${result.plate}:`, (err as Error).message);
      return result;
    }
  }
}
