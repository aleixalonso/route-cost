import { z } from 'zod';

import {
  estimateRouteRequestSchema,
  maxRouteAlternatives,
} from '../route/estimate-route.request.js';

const consumptionRateSchema = z.number().finite().positive().max(100);

const fuelPriceSchema = z.object({
  amountPerLitre: z.number().finite().positive().max(100),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

export const consumptionProfileSchema = z.object({
  urbanLitresPer100Km: consumptionRateSchema,
  interurbanLitresPer100Km: consumptionRateSchema,
  motorwayLitresPer100Km: consumptionRateSchema,
  unknownLitresPer100Km: consumptionRateSchema,
});

export const estimateRouteCostRequestSchema =
  estimateRouteRequestSchema.safeExtend({
    consumptionProfile: consumptionProfileSchema,
    fuelPrice: fuelPriceSchema,
    alternatives: z
      .number()
      .int()
      .nonnegative()
      .max(maxRouteAlternatives)
      .optional(),
  });

export type EstimateRouteCostRequest = z.infer<
  typeof estimateRouteCostRequestSchema
>;
