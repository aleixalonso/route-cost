import type { VehicleRoutingCategory } from '@route-cost/contracts';
import { consumptionProfileSchema } from '@route-cost/contracts';
import type { z } from 'zod';

import type { SelectedLocation } from '../../location-search';

type ConsumptionProfile = z.infer<typeof consumptionProfileSchema>;

export type VehicleSelection =
  | {
      readonly mode: 'catalog';
      readonly vehicleId: string;
    }
  | {
      readonly mode: 'custom';
      readonly vehicleCategory: VehicleRoutingCategory;
      readonly consumptionProfile: ConsumptionProfile;
    };

export type RouteEstimatorFormValues = {
  readonly origin: SelectedLocation;
  readonly destination: SelectedLocation;
  readonly fuelPrice: number;
} & VehicleSelection;
