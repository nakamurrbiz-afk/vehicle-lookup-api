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
});

export const VehicleResponseSchema = z.object({
  plate: z.string(),
  country: z.string(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  year: z.number().int().nullable(),
  colour: z.string().nullable(),
  fuelType: z.string().nullable(),
  vin: z.string().nullable(),
  engineSize: z.number().nullable(),
  source: z.string(),
  cachedAt: z.string().nullable(),
});

export type LookupQuery = z.infer<typeof LookupQuerySchema>;
export type VehicleResponse = z.infer<typeof VehicleResponseSchema>;
