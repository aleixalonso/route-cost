import { z } from 'zod';

import { coordinatesSchema } from './coordinates.schema.js';

export const maxRouteAlternatives = 2;

export const vehicleRoutingCategorySchema = z.enum([
  'car',
  'motorcycle',
  'maxi-scooter',
  'low-speed-scooter',
]);

export const estimateRouteRequestSchema = z
  .object({
    origin: coordinatesSchema,
    destination: coordinatesSchema,
    vehicleCategory: vehicleRoutingCategorySchema,
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
  );

export type VehicleRoutingCategory = z.infer<
  typeof vehicleRoutingCategorySchema
>;

export type EstimateRouteRequest = z.infer<typeof estimateRouteRequestSchema>;
