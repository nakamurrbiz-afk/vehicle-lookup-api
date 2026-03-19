import { z } from 'zod';

export const RdwVehicleSchema = z.object({
  kenteken:        z.string(),
  merk:            z.string().optional(),
  handelsbenaming: z.string().optional(),
  bouwjaar:        z.string().optional(),
  eerste_kleur:    z.string().optional(),
  cilinderinhoud:  z.string().optional(), // cc as string
  inrichting:      z.string().optional(), // body type
}).passthrough();

export const RdwVehicleArraySchema = z.array(RdwVehicleSchema);

export const RdwFuelSchema = z.object({
  kenteken:                  z.string(),
  brandstof_omschrijving:    z.string().optional(), // fuel type
  co2_uitstoot_gecombineerd: z.string().optional(), // g/km
}).passthrough();

export const RdwFuelArraySchema = z.array(RdwFuelSchema);

export type RdwVehicle = z.infer<typeof RdwVehicleSchema>;
export type RdwFuel    = z.infer<typeof RdwFuelSchema>;
