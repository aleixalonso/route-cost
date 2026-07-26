import { describe, expect, it } from 'vitest';

import {
  estimateRouteCostRequestSchema,
  type EstimateRouteCostResponse,
  estimateRouteCostResponseSchema,
  estimateRouteRequestSchema,
  healthStatusSchema,
  vehicleDetailResponseSchema,
  vehicleListQuerySchema,
  vehicleListResponseSchema,
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
  it('accepts a valid custom request', () => {
    expect(estimateRouteCostRequestSchema.parse(validRequest())).toEqual(
      validRequest(),
    );
  });

  it('accepts a valid catalog request', () => {
    expect(() =>
      estimateRouteCostRequestSchema.parse({
        origin: { latitude: 41.3902, longitude: 2.154 },
        destination: { latitude: 41.5912, longitude: 1.5209 },
        vehicleId: 'honda-forza-350-2025',
        fuelPrice: { amountPerLitre: 1.6, currency: 'EUR' },
        alternatives: 1,
      }),
    ).not.toThrow();
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
    [
      'neither vehicle mode',
      { vehicleCategory: undefined, consumptionProfile: undefined },
    ],
    ['both vehicle modes', { vehicleId: 'honda-forza-350-2025' }],
    [
      'vehicleId with profile',
      {
        vehicleId: 'honda-forza-350-2025',
        vehicleCategory: undefined,
      },
    ],
    ['category without profile', { consumptionProfile: undefined }],
    ['profile without category', { vehicleCategory: undefined }],
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

  it('accepts catalog and custom vehicle selection responses', () => {
    expect(() =>
      estimateRouteCostResponseSchema.parse(validResponse()),
    ).not.toThrow();

    const response = validResponse();
    response.vehicle = {
      source: 'custom',
      vehicleCategory: 'maxi-scooter',
      consumptionProfile: validRequest().consumptionProfile,
    };

    expect(() => estimateRouteCostResponseSchema.parse(response)).not.toThrow();
  });

  it('rejects an invalid vehicle source discriminator', () => {
    const response = validResponse();
    response.vehicle.source =
      'invalid' as EstimateRouteCostResponse['vehicle']['source'];

    expect(() => estimateRouteCostResponseSchema.parse(response)).toThrow();
  });
});

describe('vehicle contracts', () => {
  it.each([
    ['empty query', {}],
    ['manufacturer', { manufacturer: 'Honda' }],
    ['search', { search: 'Golf' }],
    ['category', { vehicleCategory: 'car' }],
    ['fuel type', { fuelType: 'petrol' }],
    ['powertrain', { powertrainType: 'full-hybrid' }],
  ])('accepts valid %s', (_name, query) => {
    expect(() => vehicleListQuerySchema.parse(query)).not.toThrow();
  });

  it.each([
    ['unsupported category', { vehicleCategory: 'bicycle' }],
    ['unsupported fuel type', { fuelType: 'electric' }],
    ['unsupported powertrain', { powertrainType: 'plug-in-hybrid' }],
  ])('rejects %s', (_name, query) => {
    expect(() => vehicleListQuerySchema.parse(query)).toThrow();
  });

  it('accepts list and empty list responses', () => {
    expect(() =>
      vehicleListResponseSchema.parse({
        items: [validVehicleSummary()],
        total: 1,
      }),
    ).not.toThrow();
    expect(() =>
      vehicleListResponseSchema.parse({ items: [], total: 0 }),
    ).not.toThrow();
  });

  it('accepts a detail response', () => {
    expect(() =>
      vehicleDetailResponseSchema.parse(validVehicleDetail()),
    ).not.toThrow();
  });

  it.each([
    [
      'invalid consumption data',
      { consumptionProfile: { urbanLitresPer100Km: 0 } },
    ],
    [
      'missing source metadata',
      {
        consumptionData: {
          ...validVehicleDetail().consumptionData,
          sources: [],
        },
      },
    ],
    [
      'invalid source URL',
      {
        consumptionData: {
          ...validVehicleDetail().consumptionData,
          sources: [
            {
              ...validVehicleDetail().consumptionData.sources[0],
              url: 'not-a-url',
            },
          ],
        },
      },
    ],
  ])('rejects %s', (_name, patch) => {
    expect(() =>
      vehicleDetailResponseSchema.parse({
        ...validVehicleDetail(),
        ...patch,
      }),
    ).toThrow();
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

function validVehicleSummary() {
  return {
    id: 'honda-forza-350-2025',
    manufacturer: 'Honda',
    model: 'Forza 350',
    variant: 'Standard',
    displayName: 'Honda Forza 350',
    yearFrom: 2025,
    vehicleCategory: 'maxi-scooter',
    fuelType: 'petrol',
    powertrainType: 'internal-combustion',
    engineDisplacementCc: 330,
    consumptionProfile: {
      urbanLitresPer100Km: 3.7,
      interurbanLitresPer100Km: 3.1,
      motorwayLitresPer100Km: 4,
      unknownLitresPer100Km: 3.4,
    },
    consumptionData: {
      status: 'estimated',
      confidence: 'medium',
      officialCombinedLitresPer100Km: 3.4,
    },
  } as const;
}

function validVehicleDetail() {
  return {
    ...validVehicleSummary(),
    consumptionData: {
      status: 'estimated',
      confidence: 'medium',
      officialCombinedLitresPer100Km: 3.4,
      methodology: 'Estimated from official combined consumption.',
      sources: [
        {
          type: 'manufacturer',
          title: 'Forza 350 specifications and price',
          publisher: 'Honda',
          url: 'https://www.honda.de/motorcycles/range/scooter/forza-350/specifications-and-price.html',
          accessedAt: '2026-07-26',
        },
      ],
    },
  } as const;
}
