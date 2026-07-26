import { z } from 'zod';

import { vehicleRoutingCategorySchema } from '../route/estimate-route.request.js';
import { consumptionProfileSchema } from '../route-cost/estimate-route-cost.request.js';

export const vehicleFuelTypeSchema = z.enum(['petrol', 'diesel']);

export const vehiclePowertrainTypeSchema = z.enum([
  'internal-combustion',
  'full-hybrid',
]);

export const consumptionDataStatusSchema = z.enum([
  'estimated',
  'partially-verified',
  'verified',
]);

export const consumptionDataConfidenceSchema = z.enum([
  'low',
  'medium',
  'high',
]);

export const vehicleDataSourceTypeSchema = z.enum([
  'manufacturer',
  'official-document',
  'independent-test',
  'derived',
]);

export const vehicleSummarySchema = z.object({
  id: z.string().min(1),
  manufacturer: z.string().min(1),
  model: z.string().min(1),
  variant: z.string().min(1),
  displayName: z.string().min(1),
  yearFrom: z.number().int(),
  yearTo: z.number().int().optional(),
  vehicleCategory: vehicleRoutingCategorySchema,
  fuelType: vehicleFuelTypeSchema,
  powertrainType: vehiclePowertrainTypeSchema,
  engineDisplacementCc: z.number().int().positive().optional(),
  consumptionProfile: consumptionProfileSchema,
  consumptionData: z.object({
    status: consumptionDataStatusSchema,
    confidence: consumptionDataConfidenceSchema,
    officialCombinedLitresPer100Km: z.number().finite().positive().optional(),
  }),
});

export const vehicleDetailSchema = vehicleSummarySchema.extend({
  consumptionData: z.object({
    status: consumptionDataStatusSchema,
    confidence: consumptionDataConfidenceSchema,
    officialCombinedLitresPer100Km: z.number().finite().positive().optional(),
    methodology: z.string().min(1),
    sources: z
      .array(
        z.object({
          type: vehicleDataSourceTypeSchema,
          title: z.string().min(1),
          publisher: z.string().min(1),
          url: z.url().refine((url) => url.startsWith('http')),
          accessedAt: z.iso.date(),
          notes: z.string().min(1).optional(),
        }),
      )
      .min(1),
  }),
});

export type VehicleSummary = z.infer<typeof vehicleSummarySchema>;
export type VehicleDetail = z.infer<typeof vehicleDetailSchema>;
