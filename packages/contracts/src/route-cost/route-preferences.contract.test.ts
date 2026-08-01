import { describe, expect, it } from 'vitest';

import {
  estimateRouteCostRequestSchema,
  estimateRouteCostResponseSchema,
  routeCharacteristicsSchema,
  routePreferenceComplianceSchema,
  routePreferencesInputSchema,
  routePreferencesSchema,
} from '../index.js';

describe('route preferences input schema', () => {
  it.each([
    ['empty object', {}],
    ['partial object', { avoidTolls: true }],
    ['complete object', allPreferences()],
  ])('accepts %s', (_name, preferences) => {
    expect(routePreferencesInputSchema.parse(preferences)).not.toBeUndefined();
  });

  it('rejects an omitted object at the input schema level', () => {
    expect(routePreferencesInputSchema.safeParse(undefined).success).toBe(
      false,
    );
  });

  it('accepts only real booleans', () => {
    expect(
      routePreferencesInputSchema.parse({ avoidTolls: false }),
    ).toMatchObject({ avoidTolls: false });
  });

  it('rejects non-boolean avoidance values', () => {
    for (const invalid of ['true', 1, null, {}, [], 'yes']) {
      expect(
        routePreferencesInputSchema.safeParse({ avoidTolls: invalid }).success,
      ).toBe(false);
    }
  });

  it.each([['invalid priority', { priority: 'balanced' }]])(
    'rejects %s',
    (_name, patch) => {
      expect(routePreferencesInputSchema.safeParse(patch).success).toBe(false);
    },
  );

  it('accepts both valid priorities', () => {
    expect(routePreferencesInputSchema.parse({ priority: 'fastest' })).toEqual({
      priority: 'fastest',
    });
    expect(routePreferencesInputSchema.parse({ priority: 'shortest' })).toEqual(
      { priority: 'shortest' },
    );
  });

  it('rejects unknown preference fields', () => {
    expect(
      routePreferencesInputSchema.safeParse({ avoidTunnels: true }).success,
    ).toBe(false);
    expect(
      routePreferencesInputSchema.safeParse({ use_tolls: 0 }).success,
    ).toBe(false);
  });

  it('rejects a null preference object', () => {
    expect(routePreferencesInputSchema.safeParse(null).success).toBe(false);
  });
});

describe('route preferences request integration', () => {
  it('accepts an old valid request without preferences', () => {
    const request = estimateRouteCostRequestSchema.parse(oldRequest());

    expect(request.routePreferences).toBeUndefined();
  });

  it('accepts full preferences', () => {
    const request = estimateRouteCostRequestSchema.parse({
      ...oldRequest(),
      routePreferences: allPreferences(),
    });

    expect(request.routePreferences).toEqual(allPreferences());
  });

  it('accepts partial preferences', () => {
    const request = estimateRouteCostRequestSchema.parse({
      ...oldRequest(),
      routePreferences: { avoidTolls: true },
    });

    expect(request.routePreferences).toEqual({ avoidTolls: true });
  });

  it.each([
    ['invalid priority', { priority: 'eco' }],
    ['invalid boolean', { avoidTolls: 'yes' }],
    ['unknown preference', { avoidTunnels: true }],
    ['null object', null],
  ])('rejects %s', (_name, routePreferences) => {
    expect(
      estimateRouteCostRequestSchema.safeParse({
        ...oldRequest(),
        routePreferences,
      }).success,
    ).toBe(false);
  });

  it('keeps catalog and custom vehicle modes valid with preferences', () => {
    expect(
      estimateRouteCostRequestSchema.parse({
        ...oldRequest(),
        vehicleId: 'honda-forza-350-2025',
        vehicleCategory: undefined,
        consumptionProfile: undefined,
        routePreferences: { avoidTolls: true },
      }).vehicleId,
    ).toBe('honda-forza-350-2025');
  });
});

describe('route characteristics response schema', () => {
  it('accepts known detection', () => {
    expect(
      routeCharacteristicsSchema.parse({
        tolls: known(true, 4_200, 2),
        motorways: known(false, 0, 0),
        ferries: known(false, 0, 0),
      }),
    ).toEqual({
      tolls: known(true, 4_200, 2),
      motorways: known(false, 0, 0),
      ferries: known(false, 0, 0),
    });
  });

  it('accepts unknown detection', () => {
    expect(
      routeCharacteristicsSchema.parse({
        tolls: { status: 'unknown' },
        motorways: { status: 'unknown' },
        ferries: { status: 'unknown' },
      }),
    ).toEqual({
      tolls: { status: 'unknown' },
      motorways: { status: 'unknown' },
      ferries: { status: 'unknown' },
    });
  });

  it('rejects negative distances', () => {
    expect(
      routeCharacteristicsSchema.safeParse({
        tolls: known(true, -1, 0),
        motorways: known(false, 0, 0),
        ferries: known(false, 0, 0),
      }).success,
    ).toBe(false);
  });

  it('rejects fractional segment counts', () => {
    expect(
      routeCharacteristicsSchema.safeParse({
        tolls: {
          status: 'known',
          present: true,
          distanceMetres: 1,
          segmentCount: 1.5,
        },
        motorways: known(false, 0, 0),
        ferries: known(false, 0, 0),
      }).success,
    ).toBe(false);
  });

  it('rejects an unknown status value', () => {
    expect(
      routeCharacteristicsSchema.safeParse({
        tolls: { status: 'maybe', present: true },
        motorways: known(false, 0, 0),
        ferries: known(false, 0, 0),
      }).success,
    ).toBe(false);
  });

  it('accepts zero distances', () => {
    expect(
      routeCharacteristicsSchema.parse({
        tolls: known(false, 0, 0),
        motorways: known(false, 0, 0),
        ferries: known(false, 0, 0),
      }),
    ).toMatchObject({ tolls: { present: false, distanceMetres: 0 } });
  });

  it('validates compliance conflicts', () => {
    expect(
      routePreferenceComplianceSchema.parse({
        conflicts: ['tolls-present', 'motorways-present'],
      }),
    ).toEqual({ conflicts: ['tolls-present', 'motorways-present'] });
    expect(
      routePreferenceComplianceSchema.safeParse({
        conflicts: ['priority-shortest'],
      }).success,
    ).toBe(false);
  });
});

describe('route-cost response with preferences and characteristics', () => {
  it('requires applied preferences and per-alternative characteristics', () => {
    const response = responseWithCharacteristics();

    expect(() => estimateRouteCostResponseSchema.parse(response)).not.toThrow();
    expect(response.routePreferences).toEqual(allPreferences());
    expect(response.alternatives[0]?.routeCharacteristics).toMatchObject({
      tolls: { status: 'known', present: true },
    });
    expect(response.alternatives[0]?.preferenceCompliance).toEqual({
      conflicts: ['tolls-present'],
    });
  });

  it('rejects a response without applied preferences', () => {
    const response = responseWithCharacteristics() as {
      routePreferences?: unknown;
    };
    delete response.routePreferences;

    expect(estimateRouteCostResponseSchema.safeParse(response).success).toBe(
      false,
    );
  });

  it('rejects a response without alternative characteristics', () => {
    const response = responseWithCharacteristics();
    const alternative = response.alternatives[0];
    if (alternative === undefined) {
      throw new Error('fixture missing alternative');
    }
    delete (alternative as { routeCharacteristics?: unknown })
      .routeCharacteristics;

    expect(estimateRouteCostResponseSchema.safeParse(response).success).toBe(
      false,
    );
  });

  it('accepts the complete normalized preference object shape', () => {
    expect(routePreferencesSchema.parse(allPreferences())).toEqual(
      allPreferences(),
    );
    expect(routePreferencesSchema.safeParse({ avoidTolls: true }).success).toBe(
      false,
    );
  });
});

function oldRequest() {
  return {
    origin: { latitude: 41.3902, longitude: 2.154 },
    destination: { latitude: 41.5912, longitude: 1.5209 },
    vehicleCategory: 'maxi-scooter',
    consumptionProfile: {
      urbanLitresPer100Km: 3.8,
      interurbanLitresPer100Km: 3,
      motorwayLitresPer100Km: 4.1,
      unknownLitresPer100Km: 3.4,
    },
    fuelPrice: {
      amountPerLitre: 1.6,
      currency: 'EUR',
    },
    alternatives: 1,
  } as const;
}

function allPreferences() {
  return {
    avoidTolls: true,
    avoidMotorways: false,
    avoidFerries: true,
    priority: 'fastest',
  } as const;
}

function known(present: boolean, distanceMetres: number, segmentCount: number) {
  return { status: 'known' as const, present, distanceMetres, segmentCount };
}

function responseWithCharacteristics() {
  return {
    vehicle: {
      source: 'catalog',
      vehicleId: 'honda-forza-350-2025',
      displayName: 'Honda Forza 350',
      vehicleCategory: 'maxi-scooter',
      fuelType: 'petrol',
      powertrainType: 'internal-combustion',
      consumptionProfile: {
        urbanLitresPer100Km: 3.8,
        interurbanLitresPer100Km: 3,
        motorwayLitresPer100Km: 4.1,
        unknownLitresPer100Km: 3.4,
      },
      consumptionData: {
        status: 'estimated',
        confidence: 'medium',
      },
    },
    routePreferences: allPreferences(),
    alternatives: [
      {
        id: 'primary',
        distanceMetres: 61_800,
        durationSeconds: 3240,
        encodedPolyline: 'encoded',
        summary: {
          urbanDistanceMetres: 9_200,
          interurbanDistanceMetres: 31_700,
          motorwayDistanceMetres: 20_900,
          unknownDistanceMetres: 0,
        },
        segments: [
          {
            distanceMetres: 1_300,
            beginShapeIndex: 0,
            endShapeIndex: 6,
            roadCategory: 'urban',
            classificationReason: 'urban-density',
            isToll: true,
            isFerry: false,
          },
        ],
        fuelEstimate: {
          breakdown: {
            urban: {
              distanceMetres: 9_200,
              litresPer100Km: 3.8,
              estimatedLitres: 0.3496,
            },
            interurban: {
              distanceMetres: 31_700,
              litresPer100Km: 3,
              estimatedLitres: 0.951,
            },
            motorway: {
              distanceMetres: 20_900,
              litresPer100Km: 4.1,
              estimatedLitres: 0.8569,
            },
            unknown: {
              distanceMetres: 0,
              litresPer100Km: 3.4,
              estimatedLitres: 0,
            },
          },
          totalLitres: 2.1575,
        },
        costEstimate: {
          fuelPrice: {
            amountPerLitre: 1.6,
            currency: 'EUR',
          },
          estimatedCost: 3.452,
        },
        routeCharacteristics: {
          tolls: known(true, 1_300, 1),
          motorways: known(false, 0, 0),
          ferries: known(false, 0, 0),
        },
        preferenceCompliance: {
          conflicts: ['tolls-present'],
        },
      },
    ],
  };
}
