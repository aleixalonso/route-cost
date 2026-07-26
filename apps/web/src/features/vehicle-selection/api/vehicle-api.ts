import {
  type VehicleListResponse,
  vehicleListResponseSchema,
} from '@route-cost/contracts';

import { apiRequest } from '../../../shared/api';

export function fetchVehicles(parameters: {
  readonly signal?: AbortSignal | undefined;
}): Promise<VehicleListResponse> {
  return apiRequest({
    path: '/vehicles',
    schema: vehicleListResponseSchema,
    signal: parameters.signal,
  });
}
