import { z } from 'zod';

import { vehicleSummarySchema } from './vehicle.schema.js';

export const vehicleListResponseSchema = z.object({
  items: z.array(vehicleSummarySchema),
  total: z.number().int().nonnegative(),
});

export type VehicleListResponse = z.infer<typeof vehicleListResponseSchema>;
