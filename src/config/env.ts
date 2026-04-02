import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // UK DVLA
  DVLA_API_KEY: z.string().min(1).default('PENDING'),
  DVLA_API_URL: z.string().url().default('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles'),

  // US Plate-to-VIN (RapidAPI: vehicle-plate-to-vin)
  PLATE_TO_VIN_API_KEY:       z.string().min(1).default('PENDING'),
  PLATE_TO_VIN_API_URL:       z.string().url().default('https://vehicle-plate-to-vin.p.rapidapi.com/lookup'),
  PLATE_TO_VIN_RAPIDAPI_HOST: z.string().default('vehicle-plate-to-vin.p.rapidapi.com'),

  // UK DVSA MOT History (model enrichment) — OAuth2 + API key
  DVSA_MOT_API_KEY:      z.string().min(1).default('PENDING'),
  DVSA_MOT_API_URL:      z.string().url().default('https://history.mot.api.gov.uk/v1/trade/vehicles/registration'),
  DVSA_CLIENT_ID:        z.string().default(''),
  DVSA_CLIENT_SECRET:    z.string().default(''),
  DVSA_TOKEN_URL:        z.string().url().default('https://login.microsoftonline.com/common/oauth2/v2.0/token'),
  DVSA_SCOPE:            z.string().default('https://tapi.dvsa.gov.uk/.default'),

  // US NHTSA (free)
  NHTSA_API_URL: z.string().url().default('https://vpic.nhtsa.dot.gov/api/vehicles'),

  // Cache
  REDIS_URL: z.string().optional(),
  CACHE_TTL_SECONDS: z.coerce.number().default(86400),

  // Unsplash car imagery (free key at unsplash.com/developers)
  UNSPLASH_ACCESS_KEY: z.string().default(''),

  // eBay Partner Network (EPN)
  EBAY_CAMPAIGN_ID: z.string().default(''),

  // Awin affiliate
  AWIN_AFFILIATE_ID:                   z.string().default(''),
  AWIN_AUTOTRADER_MERCHANT_ID:         z.coerce.number().default(3441),
  AWIN_MOTORS_MERCHANT_ID:             z.coerce.number().default(10966),
  AWIN_AUTOSCOUT24_FR_MERCHANT_ID:     z.coerce.number().default(15483),

  // France — SIV plate lookup
  FR_PLATE_API_KEY:        z.string().default(''),
  FR_PLATE_API_URL:        z.string().url().default('https://immatriculation-api.p.rapidapi.com/'),
  FR_PLATE_RAPIDAPI_HOST:  z.string().default('immatriculation-api.p.rapidapi.com'),

  // Admin dashboard
  ADMIN_TOKEN: z.string().min(16).default('change-me-before-deploying'),

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
    apiKey:       env.PLATE_TO_VIN_API_KEY,
    apiUrl:       env.PLATE_TO_VIN_API_URL,
    rapidApiHost: env.PLATE_TO_VIN_RAPIDAPI_HOST,
  },
  dvsaMot: {
    apiKey:      env.DVSA_MOT_API_KEY,
    apiUrl:      env.DVSA_MOT_API_URL,
    clientId:    env.DVSA_CLIENT_ID,
    clientSecret:env.DVSA_CLIENT_SECRET,
    tokenUrl:    env.DVSA_TOKEN_URL,
    scope:       env.DVSA_SCOPE,
  },
  nhtsaApiUrl: env.NHTSA_API_URL,
  unsplash: {
    accessKey: env.UNSPLASH_ACCESS_KEY,
  },
  ebay: {
    campaignId: env.EBAY_CAMPAIGN_ID,
  },
  awin: {
    affiliateId:              env.AWIN_AFFILIATE_ID,
    autotraderMerchantId:     env.AWIN_AUTOTRADER_MERCHANT_ID,
    motorsMerchantId:         env.AWIN_MOTORS_MERCHANT_ID,
    autoscout24FrMerchantId:  env.AWIN_AUTOSCOUT24_FR_MERCHANT_ID,
  },
  frPlate: {
    apiKey:      env.FR_PLATE_API_KEY,
    apiUrl:      env.FR_PLATE_API_URL,
    rapidApiHost: env.FR_PLATE_RAPIDAPI_HOST,
  },
  adminToken: env.ADMIN_TOKEN,
  redisUrl: env.REDIS_URL,
  cacheTtlSeconds: env.CACHE_TTL_SECONDS,
  httpTimeoutMs: env.HTTP_TIMEOUT_MS,
} as const;
