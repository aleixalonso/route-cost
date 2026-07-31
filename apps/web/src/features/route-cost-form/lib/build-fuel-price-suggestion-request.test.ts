import { describe, expect, it } from 'vitest';

import {
  routeEstimatorDefaultValues,
  type RouteEstimatorUiFormValues,
} from '../model/route-estimator-ui-form';
import {
  buildFuelPriceSuggestionRequest,
  fuelPriceSuggestionQueryKey,
} from './build-fuel-price-suggestion-request';

const origin = {
  id: 'origin',
  label: 'Origin',
  coordinate: { latitude: 41.387, longitude: 2.17 },
};

function createValues(
  overrides: Partial<RouteEstimatorUiFormValues> = {},
): RouteEstimatorUiFormValues {
  return {
    ...routeEstimatorDefaultValues,
    origin,
    vehicleSelect: 'honda-forza-350-2025',
    ...overrides,
  };
}

describe('buildFuelPriceSuggestionRequest', () => {
  it('returns null without a resolved origin', () => {
    expect(
      buildFuelPriceSuggestionRequest(createValues({ origin: null })),
    ).toBeNull();
  });

  it('returns null without a vehicle selection', () => {
    expect(
      buildFuelPriceSuggestionRequest(createValues({ vehicleSelect: '' })),
    ).toBeNull();
  });

  it('builds a catalog vehicle request', () => {
    expect(buildFuelPriceSuggestionRequest(createValues())).toEqual({
      coordinate: origin.coordinate,
      vehicleId: 'honda-forza-350-2025',
    });
  });

  it('returns null in custom mode without a fuel product', () => {
    expect(
      buildFuelPriceSuggestionRequest(
        createValues({ vehicleSelect: 'custom', fuelProduct: '' }),
      ),
    ).toBeNull();
  });

  it('builds an explicit fuel product request in custom mode', () => {
    expect(
      buildFuelPriceSuggestionRequest(
        createValues({ vehicleSelect: 'custom', fuelProduct: 'diesel-a' }),
      ),
    ).toEqual({
      coordinate: origin.coordinate,
      fuelProduct: 'diesel-a',
    });
  });
});

describe('fuelPriceSuggestionQueryKey', () => {
  it('uses an idle key when there is no request', () => {
    expect(fuelPriceSuggestionQueryKey(null)).toEqual([
      'fuel-price-suggestion',
      'idle',
    ]);
  });

  it('keys by vehicle selection and the rounded coordinate', () => {
    expect(
      fuelPriceSuggestionQueryKey({
        coordinate: { latitude: 41.3871234, longitude: 2.1709876 },
        vehicleId: 'honda-forza-350-2025',
      }),
    ).toEqual([
      'fuel-price-suggestion',
      '41.387123',
      '2.170988',
      'vehicle:honda-forza-350-2025',
    ]);
  });

  it('keys by fuel product selection', () => {
    expect(
      fuelPriceSuggestionQueryKey({
        coordinate: { latitude: 41.387, longitude: 2.17 },
        fuelProduct: 'diesel-a',
      }),
    ).toEqual([
      'fuel-price-suggestion',
      '41.387000',
      '2.170000',
      'fuel:diesel-a',
    ]);
  });
});
