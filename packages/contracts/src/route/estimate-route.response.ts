import { z } from 'zod';

export const estimateRouteResponseSchema = z.object({
  distanceKm: z.number().nonnegative(),
  durationSeconds: z.number().nonnegative(),
  estimatedCost: z.number().nonnegative(),
});

export type EstimateRouteResponse = z.infer<typeof estimateRouteResponseSchema>;
