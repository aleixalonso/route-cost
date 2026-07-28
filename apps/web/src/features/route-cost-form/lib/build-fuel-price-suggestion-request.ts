import type {
  FuelPriceSuggestionRequest,
  FuelProduct,
} from '@route-cost/contracts';

import type { RouteEstimatorUiFormValues } from '../../../pages/route-estimator/route-estimator-flow';
import { getVehicleMode } from '../../../pages/route-estimator/route-estimator-flow';

export function buildFuelPriceSuggestionRequest(
  values: RouteEstimatorUiFormValues,
): FuelPriceSuggestionRequest | null {
  if (values.origin === null || values.vehicleSelect.length === 0) {
    return null;
  }

  const coordinate = values.origin.coordinate;

  if (getVehicleMode(values.vehicleSelect) === 'catalog') {
    return {
      coordinate,
      vehicleId: values.vehicleSelect,
    };
  }

  if (values.fuelProduct === undefined || values.fuelProduct.length === 0) {
    return null;
  }

  return {
    coordinate,
    fuelProduct: values.fuelProduct as FuelProduct,
  };
}

export function fuelPriceSuggestionQueryKey(
  request: FuelPriceSuggestionRequest | null,
): readonly unknown[] {
  if (request === null) {
    return ['fuel-price-suggestion', 'idle'];
  }

  const selection =
    request.vehicleId === undefined
      ? `fuel:${request.fuelProduct}`
      : `vehicle:${request.vehicleId}`;

  return [
    'fuel-price-suggestion',
    request.coordinate.latitude.toFixed(6),
    request.coordinate.longitude.toFixed(6),
    selection,
  ];
}
