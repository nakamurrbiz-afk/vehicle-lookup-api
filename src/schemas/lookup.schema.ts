import { z } from 'zod';

export const LookupQuerySchema = z.object({
  plate: z
    .string({ required_error: 'plate is required' })
    .min(1)
    .max(20)
    .transform((s) => s.toUpperCase().replace(/[\s\-]/g, '')),
  country: z
    .string({ required_error: 'country is required' })
    .length(2, 'country must be a 2-letter ISO code (e.g. GB, US)')
    .transform((s) => s.toUpperCase()),
  state: z
    .string()
    .length(2, 'state must be a 2-letter US state code (e.g. CA, TX)')
    .transform((s) => s.toUpperCase())
    .optional(),
});

const MileageRecordSchema = z.object({
  date:    z.string(),
  mileage: z.number(),
  passed:  z.boolean(),
});

const RunningCostSchema = z.object({
  fuelPerYear:  z.string(),
  totalPerYear: z.string(),
  perMile:      z.string(),
  source:       z.string(),
});

const InsuranceGroupSchema = z.object({
  min:   z.number(),
  max:   z.number(),
  label: z.string(),
});


export const VehicleResponseSchema = z.object({
  plate:           z.string(),
  country:         z.string(),
  make:            z.string().nullable(),
  model:           z.string().nullable(),
  year:            z.number().int().nullable(),
  colour:          z.string().nullable(),
  fuelType:        z.string().nullable(),
  vin:             z.string().nullable(),
  engineSize:      z.number().nullable(),
  co2Emissions:    z.number().nullable(),
  mileageHistory:  z.array(MileageRecordSchema),
  commonFailures:  z.array(z.string()),
  runningCost:     RunningCostSchema.nullable(),
  euroncapStars:   z.number().int().nullable(),
  insuranceGroup:  InsuranceGroupSchema.nullable(),
  popularityCount:     z.number().int(),
  source:              z.string(),
  cachedAt:            z.string().nullable(),
  affiliateLinks:      z.array(z.object({ platform: z.string(), label: z.string(), url: z.string() })),
  // US-specific
  recallCount:         z.number().int().nullable(),
  nhtsaSafetyRating:   z.number().int().nullable(),
  mpgCity:             z.number().nullable(),
  mpgHighway:          z.number().nullable(),
});

export type LookupQuery     = z.infer<typeof LookupQuerySchema>;
export type VehicleResponse = z.infer<typeof VehicleResponseSchema>;
