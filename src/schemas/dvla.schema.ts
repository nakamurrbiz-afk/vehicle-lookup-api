import { z } from 'zod';

// DVLA Vehicle Enquiry Service API response schema
// Docs: https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/vehicle-enquiry-service/v1.1.0-vehicle-enquiry-service.html
export const DvlaResponseSchema = z.object({
  registrationNumber: z.string(),
  make: z.string().optional(),
  yearOfManufacture: z.number().int().optional(),
  colour: z.string().optional(),
  fuelType: z.string().optional(),
  engineCapacity: z.number().optional(),
  co2Emissions: z.number().optional(),
  motStatus: z.string().optional(),
  taxStatus: z.string().optional(),
  taxDueDate: z.string().optional(),
  motExpiryDate: z.string().optional(),
  monthOfFirstRegistration: z.string().optional(),
  typeApproval: z.string().optional(),
  wheelplan: z.string().optional(),
  revenueWeight: z.number().optional(),
  euroStatus: z.string().optional(),
});

export type DvlaResponse = z.infer<typeof DvlaResponseSchema>;
