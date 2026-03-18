import { z } from 'zod';

// NHTSA vPIC DecodeVinValues API response schema
// Docs: https://vpic.nhtsa.dot.gov/api/
export const NhtsaResultSchema = z.object({
  Make: z.string().optional(),
  Model: z.string().optional(),
  ModelYear: z.string().optional(),
  VehicleType: z.string().optional(),
  FuelTypePrimary: z.string().optional(),
  EngineDisplacementCC: z.string().optional(),
  ErrorCode: z.string().optional(),
  ErrorText: z.string().optional(),
});

export const NhtsaResponseSchema = z.object({
  Count: z.number(),
  Message: z.string(),
  Results: z.array(NhtsaResultSchema),
});

export type NhtsaResponse = z.infer<typeof NhtsaResponseSchema>;
