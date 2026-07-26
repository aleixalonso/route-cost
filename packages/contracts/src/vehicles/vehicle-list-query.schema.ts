import { z } from 'zod';

import { vehicleRoutingCategorySchema } from '../route/estimate-route.request.js';
import {
  vehicleFuelTypeSchema,
  vehiclePowertrainTypeSchema,
} from './vehicle.schema.js';

export const vehicleListQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  manufacturer: z.string().trim().min(1).optional(),
  vehicleCategory: vehicleRoutingCategorySchema.optional(),
  fuelType: vehicleFuelTypeSchema.optional(),
  powertrainType: vehiclePowertrainTypeSchema.optional(),
});

export type VehicleListQuery = z.infer<typeof vehicleListQuerySchema>;
