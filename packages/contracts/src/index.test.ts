import { describe, expect, it } from 'vitest';

import {
  estimateRouteCostRequestSchema,
  type EstimateRouteCostResponse,
  estimateRouteCostResponseSchema,
  estimateRouteRequestSchema,
  healthStatusSchema,
} from './index.js';

describe('contracts', () => {
  it('validates health status responses', () => {
    expect(
      healthStatusSchema.parse({
        status: 'ok',
        service: 'route-cost-api',
      }),
    ).toEqual({
      status: 'ok',
      service: 'route-cost-api',
    });
  });

  it('rejects invalid route coordinates', () => {
    expect(() =>
      estimateRouteRequestSchema.parse({
        origin: { latitude: 100, longitude: 2 },
        destination: { latitude: 41, longitude: 2 },
        vehicleCategory: 'car',
      }),
    ).toThrow();
  });

  it('rejects identical route coordinates', () => {
    expect(() =>
      estimateRouteRequestSchema.parse({
        origin: { latitude: 41, longitude: 2 },
        destination: { latitude: 41, longitude: 2 },
        vehicleCategory: 'car',
      }),
    ).toThrow();
  });
});

describe('route cost contracts', () => {
  it('accepts a valid complete request', () => {
    expect(estimateRouteCostRequestSchema.parse(validRequest())).toEqual(
      validRequest(),
    );
  });

  it.each(['car', 'motorcycle', 'maxi-scooter', 'low-speed-scooter'] as const)(
    'accepts vehicle category %s',
    (vehicleCategory) => {
      expect(
        estimateRouteCostRequestSchema.parse({
          ...validRequest(),
          vehicleCategory,
        }).vehicleCategory,
      ).toBe(vehicleCategory);
    },
  );

  it('accepts zero alternatives', () => {
    expect(
      estimateRouteCostRequestSchema.parse({
        ...validRequest(),
        alternatives: 0,
      }).alternatives,
    ).toBe(0);
  });

  it('accepts uppercase currency', () => {
    expect(
      estimateRouteCostRequestSchema.parse({
        ...validRequest(),
        fuelPrice: { amountPerLitre: 1.6, currency: 'USD' },
      }).fuelPrice.currency,
    ).toBe('USD');
  });

  it.each([
    [
      'missing unknown consumption',
      {
        consumptionProfile: {
          urbanLitresPer100Km: 3.8,
          interurbanLitresPer100Km: 3,
          motorwayLitresPer100Km: 4.1,
        },
      },
    ],
    [
      'lowercase currency',
      { fuelPrice: { amountPerLitre: 1.6, currency: 'eur' } },
    ],
    ['invalid latitude', { origin: { latitude: 91, longitude: 2.154 } }],
    [
      'identical coordinates',
      {
        origin: { latitude: 41.3902, longitude: 2.154 },
        destination: { latitude: 41.3902, longitude: 2.154 },
      },
    ],
    [
      'NaN consumption',
      { consumptionProfile: { urbanLitresPer100Km: Number.NaN } },
    ],
    [
      'infinite fuel price',
      {
        fuelPrice: {
          amountPerLitre: Number.POSITIVE_INFINITY,
          currency: 'EUR',
        },
      },
    ],
    [
      'negative consumption',
      { consumptionProfile: { urbanLitresPer100Km: -1 } },
    ],
    [
      'over max consumption',
      { consumptionProfile: { urbanLitresPer100Km: 101 } },
    ],
    ['over max price', { fuelPrice: { amountPerLitre: 101, currency: 'EUR' } }],
  ])('rejects %s', (_name, patch) => {
    expect(() =>
      estimateRouteCostRequestSchema.parse({
        ...validRequest(),
        ...patch,
      }),
    ).toThrow();
  });

  it('accepts a complete route-cost estimate response', () => {
    expect(() =>
      estimateRouteCostResponseSchema.parse(validResponse()),
    ).not.toThrow();
  });

  it('accepts missing optional segment fields', () => {
    const response = validResponse();
    response.alternatives[0]!.segments = [
      {
        distanceMetres: 1_300,
        beginShapeIndex: 0,
        endShapeIndex: 6,
        roadCategory: 'urban',
        classificationReason: 'urban-density',
      },
    ];

    expect(() => estimateRouteCostResponseSchema.parse(response)).not.toThrow();
  });

  it('rejects malformed estimate data', () => {
    const response = validResponse();
    response.alternatives[0]!.fuelEstimate.totalLitres = Number.NaN;

    expect(() => estimateRouteCostResponseSchema.parse(response)).toThrow();
  });
});

function validRequest() {
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

function validResponse(): EstimateRouteCostResponse {
  return {
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
            expectedSpeedKmh: 28,
            speedLimitKmh: 30,
            roadClass: 'primary',
            density: 11,
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
      },
    ],
  };
}
