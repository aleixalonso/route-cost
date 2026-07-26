import type { ConsumptionProfile } from './consumption-profile.js';
import type { FuelConsumptionEstimate } from './fuel-consumption-estimate.js';
import { InvalidConsumptionInputError } from './invalid-consumption-input.error.js';
import type { RouteDistanceBreakdown } from './route-distance-breakdown.js';

export function estimateRouteFuelConsumption(
  distances: RouteDistanceBreakdown,
  profile: ConsumptionProfile,
): FuelConsumptionEstimate {
  assertDistance(distances.urbanDistanceMetres, 'urbanDistanceMetres');
  assertDistance(
    distances.interurbanDistanceMetres,
    'interurbanDistanceMetres',
  );
  assertDistance(distances.motorwayDistanceMetres, 'motorwayDistanceMetres');
  assertDistance(distances.unknownDistanceMetres, 'unknownDistanceMetres');

  assertConsumptionRate(profile.urbanLitresPer100Km, 'urbanLitresPer100Km');
  assertConsumptionRate(
    profile.interurbanLitresPer100Km,
    'interurbanLitresPer100Km',
  );
  assertConsumptionRate(
    profile.motorwayLitresPer100Km,
    'motorwayLitresPer100Km',
  );
  assertConsumptionRate(profile.unknownLitresPer100Km, 'unknownLitresPer100Km');

  const urban = estimateCategory(
    distances.urbanDistanceMetres,
    profile.urbanLitresPer100Km,
  );
  const interurban = estimateCategory(
    distances.interurbanDistanceMetres,
    profile.interurbanLitresPer100Km,
  );
  const motorway = estimateCategory(
    distances.motorwayDistanceMetres,
    profile.motorwayLitresPer100Km,
  );
  const unknown = estimateCategory(
    distances.unknownDistanceMetres,
    profile.unknownLitresPer100Km,
  );

  return {
    breakdown: {
      urban,
      interurban,
      motorway,
      unknown,
    },
    totalLitres:
      urban.estimatedLitres +
      interurban.estimatedLitres +
      motorway.estimatedLitres +
      unknown.estimatedLitres,
  };
}

function estimateCategory(distanceMetres: number, litresPer100Km: number) {
  return {
    distanceMetres,
    litresPer100Km,
    estimatedLitres: (distanceMetres / 100_000) * litresPer100Km,
  };
}

function assertDistance(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new InvalidConsumptionInputError(
      `${fieldName} must be a non-negative finite number`,
    );
  }
}

function assertConsumptionRate(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new InvalidConsumptionInputError(
      `${fieldName} must be a positive finite number`,
    );
  }
}
