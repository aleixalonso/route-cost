import type { VehicleRoutingCategory } from '@route-cost/contracts';
import { consumptionProfileSchema } from '@route-cost/contracts';
import type { z } from 'zod';

import type { SelectedLocation } from '../../features/location-search';
import type { RouteEstimatorFormValues } from '../../features/route-cost-form/model/route-estimator-form';

type ConsumptionProfile = z.infer<typeof consumptionProfileSchema>;

export type VehicleMode = 'catalog' | 'custom';

export interface RouteEstimatorUiFormValues {
  readonly origin: SelectedLocation | null;
  readonly destination: SelectedLocation | null;
  readonly vehicleSelect: string;
  readonly vehicleCategory: VehicleRoutingCategory;
  readonly urbanLitresPer100Km: number;
  readonly interurbanLitresPer100Km: number;
  readonly motorwayLitresPer100Km: number;
  readonly unknownLitresPer100Km: number;
  readonly fuelPrice: number;
}

export type RouteEstimatorFieldErrors = {
  [K in keyof RouteEstimatorUiFormValues | 'sameRoute']?: string | undefined;
};

export type RegisteredInvalidField = 'vehicleSelect' | 'fuelPrice';

export const routeEstimatorDefaultValues: RouteEstimatorUiFormValues = {
  origin: null,
  destination: null,
  vehicleSelect: '',
  vehicleCategory: 'maxi-scooter',
  urbanLitresPer100Km: 3.8,
  interurbanLitresPer100Km: 3,
  motorwayLitresPer100Km: 4.1,
  unknownLitresPer100Km: 3.4,
  fuelPrice: Number.NaN,
};

export function getVehicleMode(vehicleSelect: string): VehicleMode {
  return vehicleSelect === 'custom' ? 'custom' : 'catalog';
}

export function validateRouteEstimatorForm(
  values: RouteEstimatorUiFormValues,
): {
  readonly values: RouteEstimatorFormValues | null;
  readonly errors: RouteEstimatorFieldErrors;
} {
  const errors: RouteEstimatorFieldErrors = {};

  if (values.origin === null) {
    errors.origin = 'Choose a resolved origin.';
  }

  if (values.destination === null) {
    errors.destination = 'Choose a resolved destination.';
  }

  if (
    values.origin !== null &&
    values.destination !== null &&
    values.origin.coordinate.latitude ===
      values.destination.coordinate.latitude &&
    values.origin.coordinate.longitude ===
      values.destination.coordinate.longitude
  ) {
    errors.sameRoute = 'Origin and destination must be different.';
  }

  if (values.vehicleSelect.length === 0) {
    errors.vehicleSelect = 'Choose a catalog vehicle or custom vehicle.';
  }

  if (!isPositiveFinite(values.fuelPrice)) {
    errors.fuelPrice = 'Enter a positive fuel price.';
  }

  if (values.vehicleSelect === 'custom') {
    validateConsumption(
      values.urbanLitresPer100Km,
      'urbanLitresPer100Km',
      errors,
    );
    validateConsumption(
      values.interurbanLitresPer100Km,
      'interurbanLitresPer100Km',
      errors,
    );
    validateConsumption(
      values.motorwayLitresPer100Km,
      'motorwayLitresPer100Km',
      errors,
    );
    validateConsumption(
      values.unknownLitresPer100Km,
      'unknownLitresPer100Km',
      errors,
    );
  }

  if (Object.values(errors).some((message) => message !== undefined)) {
    return { values: null, errors };
  }

  if (values.origin === null || values.destination === null) {
    return { values: null, errors };
  }

  if (values.vehicleSelect === 'custom') {
    const consumptionProfile: ConsumptionProfile = {
      urbanLitresPer100Km: values.urbanLitresPer100Km,
      interurbanLitresPer100Km: values.interurbanLitresPer100Km,
      motorwayLitresPer100Km: values.motorwayLitresPer100Km,
      unknownLitresPer100Km: values.unknownLitresPer100Km,
    };

    return {
      values: {
        mode: 'custom',
        origin: values.origin,
        destination: values.destination,
        vehicleCategory: values.vehicleCategory,
        consumptionProfile,
        fuelPrice: values.fuelPrice,
      },
      errors,
    };
  }

  return {
    values: {
      mode: 'catalog',
      origin: values.origin,
      destination: values.destination,
      vehicleId: values.vehicleSelect,
      fuelPrice: values.fuelPrice,
    },
    errors,
  };
}

export function getFirstInvalidRegisteredField(
  errors: RouteEstimatorFieldErrors,
): RegisteredInvalidField | null {
  if (errors.vehicleSelect !== undefined) {
    return 'vehicleSelect';
  }

  if (errors.fuelPrice !== undefined) {
    return 'fuelPrice';
  }

  return null;
}

function validateConsumption(
  value: number,
  field: keyof Pick<
    RouteEstimatorUiFormValues,
    | 'urbanLitresPer100Km'
    | 'interurbanLitresPer100Km'
    | 'motorwayLitresPer100Km'
    | 'unknownLitresPer100Km'
  >,
  errors: RouteEstimatorFieldErrors,
): void {
  if (!isPositiveFinite(value) || value > 100) {
    errors[field] = 'Enter a consumption value between 0 and 100.';
  }
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value <= 100;
}
