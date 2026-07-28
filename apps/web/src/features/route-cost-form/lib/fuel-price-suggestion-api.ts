import {
  type FuelPriceSuggestionRequest,
  type FuelPriceSuggestionResponse,
  fuelPriceSuggestionResponseSchema,
} from '@route-cost/contracts';

import { apiRequest } from '../../../shared/api';

export function suggestFuelPrice(
  request: FuelPriceSuggestionRequest,
  signal?: AbortSignal,
): Promise<FuelPriceSuggestionResponse> {
  return apiRequest({
    path: '/fuel-price-suggestions',
    method: 'POST',
    body: request,
    schema: fuelPriceSuggestionResponseSchema,
    signal,
  });
}
