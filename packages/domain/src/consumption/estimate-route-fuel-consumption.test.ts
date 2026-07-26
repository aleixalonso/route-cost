import { describe, expect, it } from 'vitest';

import type { ConsumptionProfile } from './consumption-profile.js';
import { estimateRouteFuelConsumption } from './estimate-route-fuel-consumption.js';
import { InvalidConsumptionInputError } from './invalid-consumption-input.error.js';
import type { RouteDistanceBreakdown } from './route-distance-breakdown.js';

const distances: RouteDistanceBreakdown = {
  urbanDistanceMetres: 10_000,
  interurbanDistanceMetres: 20_000,
  motorwayDistanceMetres: 30_000,
  unknownDistanceMetres: 5_000,
};

const profile: ConsumptionProfile = {
  urbanLitresPer100Km: 4,
  interurbanLitresPer100Km: 3,
  motorwayLitresPer100Km: 5,
  unknownLitresPer100Km: 4,
};

describe('estimateRouteFuelConsumption', () => {
  it('estimates one category with distance', () => {
    const estimate = estimateRouteFuelConsumption(
      {
        urbanDistanceMetres: 10_000,
        interurbanDistanceMetres: 0,
        motorwayDistanceMetres: 0,
        unknownDistanceMetres: 0,
      },
      profile,
    );

    expect(estimate.breakdown.urban.estimatedLitres).toBeCloseTo(0.4);
    expect(estimate.totalLitres).toBeCloseTo(0.4);
  });

  it('estimates all four categories', () => {
    const estimate = estimateRouteFuelConsumption(distances, profile);

    expect(estimate.breakdown.urban.estimatedLitres).toBeCloseTo(0.4);
    expect(estimate.breakdown.interurban.estimatedLitres).toBeCloseTo(0.6);
    expect(estimate.breakdown.motorway.estimatedLitres).toBeCloseTo(1.5);
    expect(estimate.breakdown.unknown.estimatedLitres).toBeCloseTo(0.2);
    expect(estimate.totalLitres).toBeCloseTo(2.7);
  });

  it.each([
    ['urban', { ...distances, urbanDistanceMetres: 0 }],
    ['interurban', { ...distances, interurbanDistanceMetres: 0 }],
    ['motorway', { ...distances, motorwayDistanceMetres: 0 }],
    ['unknown', { ...distances, unknownDistanceMetres: 0 }],
  ] as const)('includes zero %s distance', (category, routeDistances) => {
    const estimate = estimateRouteFuelConsumption(routeDistances, profile);

    expect(estimate.breakdown[category].distanceMetres).toBe(0);
    expect(estimate.breakdown[category].estimatedLitres).toBe(0);
  });

  it('estimates an entirely unknown route with the explicit unknown rate', () => {
    const estimate = estimateRouteFuelConsumption(
      {
        urbanDistanceMetres: 0,
        interurbanDistanceMetres: 0,
        motorwayDistanceMetres: 0,
        unknownDistanceMetres: 10_000,
      },
      profile,
    );

    expect(estimate.totalLitres).toBeCloseTo(0.4);
  });

  it('estimates an entirely motorway route', () => {
    const estimate = estimateRouteFuelConsumption(
      {
        urbanDistanceMetres: 0,
        interurbanDistanceMetres: 0,
        motorwayDistanceMetres: 100_000,
        unknownDistanceMetres: 0,
      },
      profile,
    );

    expect(estimate.totalLitres).toBeCloseTo(5);
  });

  it('sets total litres to the category sum', () => {
    const estimate = estimateRouteFuelConsumption(distances, profile);
    const categorySum =
      estimate.breakdown.urban.estimatedLitres +
      estimate.breakdown.interurban.estimatedLitres +
      estimate.breakdown.motorway.estimatedLitres +
      estimate.breakdown.unknown.estimatedLitres;

    expect(estimate.totalLitres).toBeCloseTo(categorySum);
  });

  it('does not mutate input objects', () => {
    const inputDistances = { ...distances };
    const inputProfile = { ...profile };

    estimateRouteFuelConsumption(inputDistances, inputProfile);

    expect(inputDistances).toEqual(distances);
    expect(inputProfile).toEqual(profile);
  });

  it.each<
    readonly [
      string,
      {
        distances?: Partial<RouteDistanceBreakdown>;
        profile?: Partial<ConsumptionProfile>;
      },
    ]
  >([
    ['negative distance', { distances: { urbanDistanceMetres: -1 } }],
    ['negative consumption rate', { profile: { urbanLitresPer100Km: -1 } }],
    ['zero consumption rate', { profile: { urbanLitresPer100Km: 0 } }],
    ['NaN distance', { distances: { urbanDistanceMetres: Number.NaN } }],
    [
      'positive infinity distance',
      { distances: { urbanDistanceMetres: Number.POSITIVE_INFINITY } },
    ],
    [
      'negative infinity rate',
      { profile: { urbanLitresPer100Km: Number.NEGATIVE_INFINITY } },
    ],
  ])('rejects %s', (_name, patch) => {
    expect(() =>
      estimateRouteFuelConsumption(
        { ...distances, ...patch.distances },
        { ...profile, ...patch.profile },
      ),
    ).toThrow(InvalidConsumptionInputError);
  });

  it('supports fractional metres', () => {
    const estimate = estimateRouteFuelConsumption(
      {
        urbanDistanceMetres: 123.45,
        interurbanDistanceMetres: 0,
        motorwayDistanceMetres: 0,
        unknownDistanceMetres: 0,
      },
      profile,
    );

    expect(estimate.totalLitres).toBeCloseTo(0.004938);
  });

  it('supports fractional consumption rates', () => {
    const estimate = estimateRouteFuelConsumption(distances, {
      urbanLitresPer100Km: 3.8,
      interurbanLitresPer100Km: 3.1,
      motorwayLitresPer100Km: 4.2,
      unknownLitresPer100Km: 3.4,
    });

    expect(estimate.totalLitres).toBeCloseTo(2.43);
  });

  it('supports large valid values without rounding', () => {
    const estimate = estimateRouteFuelConsumption(
      {
        urbanDistanceMetres: 10_000_000,
        interurbanDistanceMetres: 20_000_000,
        motorwayDistanceMetres: 30_000_000,
        unknownDistanceMetres: 40_000_000,
      },
      {
        urbanLitresPer100Km: 20,
        interurbanLitresPer100Km: 30,
        motorwayLitresPer100Km: 40,
        unknownLitresPer100Km: 50,
      },
    );

    expect(estimate.totalLitres).toBeCloseTo(40_000);
  });
});
