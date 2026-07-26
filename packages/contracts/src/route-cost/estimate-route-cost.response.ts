import { z } from 'zod';

import { routeAlternativeSchema } from '../route/estimate-route.response.js';

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

export const estimateRouteCostResponseSchema = z.object({
  alternatives: z.array(routeCostAlternativeSchema),
});

export type EstimateRouteCostResponse = z.infer<
  typeof estimateRouteCostResponseSchema
>;
