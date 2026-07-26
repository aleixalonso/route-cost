import {
  type EstimateRouteCostRequest,
  estimateRouteCostRequestSchema,
} from '@route-cost/contracts';

import type { RouteEstimatorFormValues } from '../model/route-estimator-form';

export function buildRouteCostEstimateRequest(
  formValues: RouteEstimatorFormValues,
): EstimateRouteCostRequest {
  const baseRequest = {
    origin: formValues.origin.coordinate,
    destination: formValues.destination.coordinate,
    fuelPrice: {
      amountPerLitre: formValues.fuelPrice,
      currency: 'EUR',
    },
    alternatives: 1,
  } as const;

  if (formValues.mode === 'catalog') {
    return estimateRouteCostRequestSchema.parse({
      ...baseRequest,
      vehicleId: formValues.vehicleId,
    });
  }

  return estimateRouteCostRequestSchema.parse({
    ...baseRequest,
    vehicleCategory: formValues.vehicleCategory,
    consumptionProfile: formValues.consumptionProfile,
  });
}
