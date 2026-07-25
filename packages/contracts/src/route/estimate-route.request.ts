import { z } from 'zod';

import { coordinatesSchema } from './coordinates.schema.js';

export const estimateRouteRequestSchema = z.object({
  origin: coordinatesSchema,
  destination: coordinatesSchema,
  vehicleId: z.string().min(1),
});

export type EstimateRouteRequest = z.infer<typeof estimateRouteRequestSchema>;
