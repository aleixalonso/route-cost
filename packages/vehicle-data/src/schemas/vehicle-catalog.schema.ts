import { z } from 'zod';

import { vehicleCatalogEntrySchema } from './vehicle-catalog-entry.schema.js';

export const vehicleCatalogSchema = z
  .array(vehicleCatalogEntrySchema)
  .length(6)
  .superRefine((vehicles, context) => {
    addUniqueIssue(
      vehicles.map((vehicle) => vehicle.id),
      'id',
      context,
    );
    addUniqueIssue(
      vehicles.map((vehicle) => vehicle.displayName),
      'displayName',
      context,
    );
    addUniqueIssue(
      vehicles.map((vehicle) =>
        [
          vehicle.manufacturer,
          vehicle.model,
          vehicle.variant,
          vehicle.yearFrom,
          vehicle.yearTo ?? '',
        ].join('|'),
      ),
      'identity',
      context,
    );

    const carCount = vehicles.filter(
      (vehicle) => vehicle.vehicleCategory === 'car',
    ).length;
    const motorcycleLikeCount = vehicles.length - carCount;
    const maxiScooterCount = vehicles.filter(
      (vehicle) => vehicle.vehicleCategory === 'maxi-scooter',
    ).length;
    const motorcycleCount = vehicles.filter(
      (vehicle) => vehicle.vehicleCategory === 'motorcycle',
    ).length;
    const combustionCarCount = vehicles.filter(
      (vehicle) =>
        vehicle.vehicleCategory === 'car' &&
        vehicle.powertrainType === 'internal-combustion',
    ).length;
    const hybridCarCount = vehicles.filter(
      (vehicle) =>
        vehicle.vehicleCategory === 'car' &&
        vehicle.powertrainType === 'full-hybrid',
    ).length;
    const petrolCarCount = vehicles.filter(
      (vehicle) =>
        vehicle.vehicleCategory === 'car' && vehicle.fuelType === 'petrol',
    ).length;
    const dieselCarCount = vehicles.filter(
      (vehicle) =>
        vehicle.vehicleCategory === 'car' && vehicle.fuelType === 'diesel',
    ).length;

    addCountIssue(carCount, 3, 'car count', context);
    addCountIssue(motorcycleLikeCount, 3, 'motorcycle-like count', context);
    addCountIssue(maxiScooterCount, 2, 'maxi-scooter count', context);
    addCountIssue(motorcycleCount, 1, 'motorcycle count', context);
    addCountIssue(combustionCarCount, 2, 'combustion car count', context);
    addCountIssue(hybridCarCount, 1, 'hybrid car count', context);

    if (petrolCarCount < 1) {
      context.addIssue({
        code: 'custom',
        message: 'Catalog must include at least one petrol car.',
      });
    }

    if (dieselCarCount < 1) {
      context.addIssue({
        code: 'custom',
        message: 'Catalog must include at least one diesel car.',
      });
    }
  });

function addUniqueIssue(
  values: readonly string[],
  fieldName: string,
  context: z.RefinementCtx,
): void {
  if (new Set(values).size !== values.length) {
    context.addIssue({
      code: 'custom',
      message: `Catalog contains duplicate ${fieldName}.`,
    });
  }
}

function addCountIssue(
  actual: number,
  expected: number,
  label: string,
  context: z.RefinementCtx,
): void {
  if (actual !== expected) {
    context.addIssue({
      code: 'custom',
      message: `Expected ${expected} ${label}; found ${actual}.`,
    });
  }
}
