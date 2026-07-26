import {
  type EstimateRouteCostRequest,
  type EstimateRouteCostResponse,
  estimateRouteCostResponseSchema,
} from '@route-cost/contracts';

import { apiRequest } from '../../../shared/api';

export function postRouteCostEstimate(
  request: EstimateRouteCostRequest,
): Promise<EstimateRouteCostResponse> {
  return apiRequest({
    path: '/route-cost-estimates',
    method: 'POST',
    body: request,
    schema: estimateRouteCostResponseSchema,
  });
}
