import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // UK DVLA
  DVLA_API_KEY: z.string().min(1).default('PENDING'),
  DVLA_API_URL: z.string().url().default('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles'),

  // US Plate-to-VIN (commercial)
  PLATE_TO_VIN_API_KEY: z.string().min(1).default('PENDING'),
  PLATE_TO_VIN_API_URL: z.string().url().default('https://api.plate2vin.com/v1/lookup'),

  // UK DVSA MOT History (model enrichment)
  DVSA_MOT_API_KEY: z.string().min(1).default('PENDING'),
  DVSA_MOT_API_URL: z.string().url().default('https://beta.check-mot.service.gov.uk/trade/vehicles/mot-tests'),

  // US NHTSA (free)
  NHTSA_API_URL: z.string().url().default('https://vpic.nhtsa.dot.gov/api/vehicles'),

  // Cache
  REDIS_URL: z.string().optional(),
  CACHE_TTL_SECONDS: z.coerce.number().default(86400),

  // HTTP
  HTTP_TIMEOUT_MS: z.coerce.number().default(8000),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  dvla: {
    apiKey: env.DVLA_API_KEY,
    apiUrl: env.DVLA_API_URL,
  },
  plateToVin: {
    apiKey: env.PLATE_TO_VIN_API_KEY,
    apiUrl: env.PLATE_TO_VIN_API_URL,
  },
  dvsaMot: {
    apiKey: env.DVSA_MOT_API_KEY,
    apiUrl: env.DVSA_MOT_API_URL,
  },
  nhtsaApiUrl: env.NHTSA_API_URL,
  redisUrl: env.REDIS_URL,
  cacheTtlSeconds: env.CACHE_TTL_SECONDS,
  httpTimeoutMs: env.HTTP_TIMEOUT_MS,
} as const;
