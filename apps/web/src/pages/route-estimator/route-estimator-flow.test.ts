import { describe, expect, it } from 'vitest';

import {
  getFirstInvalidRegisteredField,
  getVehicleMode,
  routeEstimatorDefaultValues,
  type RouteEstimatorUiFormValues,
  validateRouteEstimatorForm,
} from './route-estimator-flow';

const origin = {
  id: 'origin',
  label: 'Origin',
  coordinate: { latitude: 41.387, longitude: 2.17 },
};

const destination = {
  id: 'destination',
  label: 'Destination',
  coordinate: { latitude: 41.4036, longitude: 2.1744 },
};

function createValues(
  overrides: Partial<RouteEstimatorUiFormValues> = {},
): RouteEstimatorUiFormValues {
  return {
    ...routeEstimatorDefaultValues,
    origin,
    destination,
    vehicleSelect: 'honda-forza-350-2025',
    fuelPrice: 1.6,
    ...overrides,
  };
}

describe('route estimator flow', () => {
  it('uses catalog mode unless custom is selected', () => {
    expect(getVehicleMode('honda-forza-350-2025')).toBe('catalog');
    expect(getVehicleMode('')).toBe('catalog');
    expect(getVehicleMode('custom')).toBe('custom');
  });

  it('reports missing required input and first registered invalid field', () => {
    const validation = validateRouteEstimatorForm(routeEstimatorDefaultValues);

    expect(validation.values).toBeNull();
    expect(validation.errors).toMatchObject({
      origin: 'Choose a resolved origin.',
      destination: 'Choose a resolved destination.',
      vehicleSelect: 'Choose a catalog vehicle or custom vehicle.',
      fuelPrice: 'Enter a positive fuel price.',
    });
    expect(getFirstInvalidRegisteredField(validation.errors)).toBe(
      'vehicleSelect',
    );
  });

  it('rejects identical resolved locations', () => {
    const validation = validateRouteEstimatorForm(
      createValues({ destination: origin }),
    );

    expect(validation.values).toBeNull();
    expect(validation.errors.sameRoute).toBe(
      'Origin and destination must be different.',
    );
  });

  it('returns catalog submission values', () => {
    const validation = validateRouteEstimatorForm(createValues());

    expect(validation.errors).toEqual({});
    expect(validation.values).toEqual({
      mode: 'catalog',
      origin,
      destination,
      vehicleId: 'honda-forza-350-2025',
      fuelPrice: 1.6,
    });
  });

  it('returns custom submission values with a complete consumption profile', () => {
    const validation = validateRouteEstimatorForm(
      createValues({
        vehicleSelect: 'custom',
        vehicleCategory: 'motorcycle',
        urbanLitresPer100Km: 4,
        interurbanLitresPer100Km: 3.5,
        motorwayLitresPer100Km: 5,
        unknownLitresPer100Km: 4.2,
      }),
    );

    expect(validation.errors).toEqual({});
    expect(validation.values).toEqual({
      mode: 'custom',
      origin,
      destination,
      vehicleCategory: 'motorcycle',
      consumptionProfile: {
        urbanLitresPer100Km: 4,
        interurbanLitresPer100Km: 3.5,
        motorwayLitresPer100Km: 5,
        unknownLitresPer100Km: 4.2,
      },
      fuelPrice: 1.6,
    });
  });

  it('validates custom consumption fields only in custom mode', () => {
    const catalogValidation = validateRouteEstimatorForm(
      createValues({ urbanLitresPer100Km: Number.NaN }),
    );
    const customValidation = validateRouteEstimatorForm(
      createValues({
        vehicleSelect: 'custom',
        urbanLitresPer100Km: Number.NaN,
      }),
    );

    expect(catalogValidation.errors.urbanLitresPer100Km).toBeUndefined();
    expect(customValidation.values).toBeNull();
    expect(customValidation.errors.urbanLitresPer100Km).toBe(
      'Enter a consumption value between 0 and 100.',
    );
  });
});
