import { z } from 'zod';

import { vehicleDetailSchema } from './vehicle.schema.js';

export const vehicleDetailResponseSchema = vehicleDetailSchema;

export type VehicleDetailResponse = z.infer<typeof vehicleDetailResponseSchema>;
