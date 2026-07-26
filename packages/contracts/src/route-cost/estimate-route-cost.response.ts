import { z } from 'zod';

import { vehicleRoutingCategorySchema } from '../route/estimate-route.request.js';
import { routeAlternativeSchema } from '../route/estimate-route.response.js';
import {
  consumptionDataConfidenceSchema,
  consumptionDataStatusSchema,
  vehicleFuelTypeSchema,
  vehiclePowertrainTypeSchema,
} from '../vehicles/vehicle.schema.js';
import { consumptionProfileSchema } from './estimate-route-cost.request.js';

const categoryFuelEstimateSchema = z.object({
  distanceMetres: z.number().finite().nonnegative(),
  litresPer100Km: z.number().finite().positive(),
  estimatedLitres: z.number().finite().nonnegative(),
});

export const fuelConsumptionEstimateSchema = z.object({
  breakdown: z.object({
    urban: categoryFuelEstimateSchema,
    interurban: categoryFuelEstimateSchema,
    motorway: categoryFuelEstimateSchema,
    unknown: categoryFuelEstimateSchema,
  }),
  totalLitres: z.number().finite().nonnegative(),
});

export const fuelCostEstimateSchema = z.object({
  fuelPrice: z.object({
    amountPerLitre: z.number().finite().positive(),
    currency: z.string().regex(/^[A-Z]{3}$/),
  }),
  estimatedCost: z.number().finite().nonnegative(),
});

export const routeCostAlternativeSchema = routeAlternativeSchema.extend({
  fuelEstimate: fuelConsumptionEstimateSchema,
  costEstimate: fuelCostEstimateSchema,
});

export const routeCostVehicleSelectionSchema = z.object({
  source: z.enum(['catalog', 'custom']),
  vehicleId: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
  vehicleCategory: vehicleRoutingCategorySchema,
  fuelType: vehicleFuelTypeSchema.optional(),
  powertrainType: vehiclePowertrainTypeSchema.optional(),
  consumptionProfile: consumptionProfileSchema,
  consumptionData: z
    .object({
      status: consumptionDataStatusSchema,
      confidence: consumptionDataConfidenceSchema,
    })
    .optional(),
});

export const estimateRouteCostResponseSchema = z.object({
  vehicle: routeCostVehicleSelectionSchema,
  alternatives: z.array(routeCostAlternativeSchema),
});

export type EstimateRouteCostResponse = z.infer<
  typeof estimateRouteCostResponseSchema
>;
