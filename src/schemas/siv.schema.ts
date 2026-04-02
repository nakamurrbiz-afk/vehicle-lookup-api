import { z } from 'zod';

// Generic schema for French SIV-based plate lookup APIs (RapidAPI)
// Field names vary by provider — we accept common variants via union/optional
export const SivResponseSchema = z.object({
  // Make — common field names across providers
  marque:        z.string().optional(),
  make:          z.string().optional(),
  constructeur:  z.string().optional(),

  // Model
  modele:        z.string().optional(),
  model:         z.string().optional(),
  denomination:  z.string().optional(),

  // Year — first registration year
  annee:                           z.union([z.string(), z.number()]).optional(),
  annee_premiere_immatriculation:  z.union([z.string(), z.number()]).optional(),
  year:                            z.union([z.string(), z.number()]).optional(),

  // Colour
  couleur:       z.string().optional(),
  color:         z.string().optional(),
  colour:        z.string().optional(),

  // Fuel type
  energie:       z.string().optional(),
  carburant:     z.string().optional(),
  fuel:          z.string().optional(),

  // Engine size (cc)
  cylindree:     z.union([z.string(), z.number()]).optional(),
  engine_size:   z.union([z.string(), z.number()]).optional(),

  // CO2 (g/km)
  co2:           z.union([z.string(), z.number()]).optional(),
  co2_emissions: z.union([z.string(), z.number()]).optional(),
}).passthrough();

export type SivResponse = z.infer<typeof SivResponseSchema>;
