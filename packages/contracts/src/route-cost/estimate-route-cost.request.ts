import { z } from 'zod';

import { coordinatesSchema } from '../route/coordinates.schema.js';
import {
  maxRouteAlternatives,
  vehicleRoutingCategorySchema,
} from '../route/estimate-route.request.js';
import { routePreferencesInputSchema } from './route-preferences.contract.js';

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

export const estimateRouteCostRequestSchema = z
  .object({
    origin: coordinatesSchema,
    destination: coordinatesSchema,
    vehicleId: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    vehicleCategory: vehicleRoutingCategorySchema.optional(),
    consumptionProfile: consumptionProfileSchema.optional(),
    fuelPrice: fuelPriceSchema,
    routePreferences: routePreferencesInputSchema.optional(),
    alternatives: z
      .number()
      .int()
      .nonnegative()
      .max(maxRouteAlternatives)
      .optional(),
  })
  .refine(
    (request) =>
      request.origin.latitude !== request.destination.latitude ||
      request.origin.longitude !== request.destination.longitude,
    {
      message: 'Origin and destination must not be identical.',
      path: ['destination'],
    },
  )
  .superRefine((request, context) => {
    const hasVehicleId = request.vehicleId !== undefined;
    const hasVehicleCategory = request.vehicleCategory !== undefined;
    const hasConsumptionProfile = request.consumptionProfile !== undefined;

    if (hasVehicleId && !hasVehicleCategory && !hasConsumptionProfile) {
      return;
    }

    if (!hasVehicleId && hasVehicleCategory && hasConsumptionProfile) {
      return;
    }

    context.addIssue({
      code: 'custom',
      message:
        'Provide exactly one vehicle selection mode: vehicleId or vehicleCategory with consumptionProfile.',
      path: ['vehicleId'],
    });
  });

export type EstimateRouteCostRequest = z.infer<
  typeof estimateRouteCostRequestSchema
>;
