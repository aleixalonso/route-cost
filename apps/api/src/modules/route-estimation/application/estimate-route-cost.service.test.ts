import type { RoutingProvider } from '@route-cost/routing';
import { RoutingProviderTimeoutError } from '@route-cost/routing';
import { describe, expect, it, vi } from 'vitest';

import { EstimateRouteCostService } from './estimate-route-cost.service';

const request = {
  origin: { latitude: 41.3902, longitude: 2.154 },
  destination: { latitude: 41.5912, longitude: 1.5209 },
  vehicleCategory: 'maxi-scooter',
  consumptionProfile: {
    urbanLitresPer100Km: 4,
    interurbanLitresPer100Km: 3,
    motorwayLitresPer100Km: 5,
    unknownLitresPer100Km: 4,
  },
  fuelPrice: {
    amountPerLitre: 1.6,
    currency: 'EUR',
  },
  alternatives: 1,
} as const;

describe('EstimateRouteCostService', () => {
  it('calls the provider exactly once with the routing request', async () => {
    const calculateRoutes = vi.fn().mockResolvedValue(routes());
    const provider: RoutingProvider = { calculateRoutes };

    await new EstimateRouteCostService(provider).estimate(request);

    expect(calculateRoutes).toHaveBeenCalledOnce();
    expect(calculateRoutes).toHaveBeenCalledWith({
      origin: request.origin,
      destination: request.destination,
      vehicleCategory: 'maxi-scooter',
      alternatives: 1,
    });
  });

  it('estimates one route alternative correctly', async () => {
    const result = await new EstimateRouteCostService(provider()).estimate(
      request,
    );

    expect(result.alternatives[0]).toMatchObject({
      id: 'primary',
      distanceMetres: 65_000,
      summary: {
        urbanDistanceMetres: 10_000,
        interurbanDistanceMetres: 20_000,
        motorwayDistanceMetres: 30_000,
        unknownDistanceMetres: 5_000,
      },
      fuelEstimate: {
        breakdown: {
          urban: {
            distanceMetres: 10_000,
            litresPer100Km: 4,
            estimatedLitres: 0.4,
          },
          interurban: {
            distanceMetres: 20_000,
            litresPer100Km: 3,
          },
          motorway: {
            distanceMetres: 30_000,
            litresPer100Km: 5,
            estimatedLitres: 1.5,
          },
          unknown: {
            distanceMetres: 5_000,
            litresPer100Km: 4,
            estimatedLitres: 0.2,
          },
        },
      },
    });
    expect(
      result.alternatives[0]?.fuelEstimate.breakdown.interurban.estimatedLitres,
    ).toBeCloseTo(0.6);
    expect(result.alternatives[0]?.fuelEstimate.totalLitres).toBeCloseTo(2.7);
    expect(result.alternatives[0]?.costEstimate.estimatedCost).toBeCloseTo(
      4.32,
    );
  });

  it('estimates multiple alternatives independently and preserves ordering', async () => {
    const result = await new EstimateRouteCostService(provider()).estimate(
      request,
    );

    expect(result.alternatives.map((alternative) => alternative.id)).toEqual([
      'primary',
      'alternative-1',
    ]);
    expect(result.alternatives[0]?.fuelEstimate.totalLitres).toBeCloseTo(2.7);
    expect(result.alternatives[1]?.fuelEstimate.totalLitres).toBeCloseTo(0.8);
    expect(result.alternatives[1]?.costEstimate.estimatedCost).toBeCloseTo(
      1.28,
    );
  });

  it('applies fuel price independently to each alternative', async () => {
    const result = await new EstimateRouteCostService(provider()).estimate({
      ...request,
      fuelPrice: { amountPerLitre: 2, currency: 'USD' },
    });

    expect(result.alternatives[0]?.costEstimate).toEqual({
      fuelPrice: { amountPerLitre: 2, currency: 'USD' },
      estimatedCost: 5.4,
    });
    expect(result.alternatives[1]?.costEstimate).toEqual({
      fuelPrice: { amountPerLitre: 2, currency: 'USD' },
      estimatedCost: 1.6,
    });
  });

  it('propagates provider errors for existing application mappings', async () => {
    const error = new RoutingProviderTimeoutError();
    const provider: RoutingProvider = {
      calculateRoutes: vi.fn().mockRejectedValue(error),
    };

    await expect(
      new EstimateRouteCostService(provider).estimate(request),
    ).rejects.toBe(error);
  });

  it('preserves provider-neutral segment data without provider-specific transformation', async () => {
    const result = await new EstimateRouteCostService(provider()).estimate(
      request,
    );

    expect(result.alternatives[0]?.segments[0]).toEqual({
      distanceMetres: 10_000,
      beginShapeIndex: 0,
      endShapeIndex: 10,
      roadCategory: 'urban',
      classificationReason: 'urban-density',
      expectedSpeedKmh: 28,
      speedLimitKmh: 30,
      roadClass: 'primary',
      density: 11,
    });
  });
});

function provider(): RoutingProvider {
  return {
    calculateRoutes: vi.fn().mockResolvedValue(routes()),
  };
}

function routes() {
  return {
    alternatives: [
      {
        id: 'primary',
        distanceMetres: 65_000,
        durationSeconds: 3600,
        encodedPolyline: 'primary-polyline',
        segments: [
          {
            distanceMetres: 10_000,
            beginShapeIndex: 0,
            endShapeIndex: 10,
            roadCategory: 'urban',
            classificationReason: 'urban-density',
            expectedSpeedKmh: 28,
            speedLimitKmh: 30,
            roadClass: 'primary',
            density: 11,
          },
          {
            distanceMetres: 20_000,
            beginShapeIndex: 11,
            endShapeIndex: 20,
            roadCategory: 'interurban',
            classificationReason: 'interurban-road-class',
          },
          {
            distanceMetres: 30_000,
            beginShapeIndex: 21,
            endShapeIndex: 30,
            roadCategory: 'motorway',
            classificationReason: 'road-class-motorway',
          },
          {
            distanceMetres: 5_000,
            beginShapeIndex: 31,
            endShapeIndex: 35,
            roadCategory: 'unknown',
            classificationReason: 'insufficient-data',
          },
        ],
      },
      {
        id: 'alternative-1',
        distanceMetres: 20_000,
        durationSeconds: 2400,
        encodedPolyline: 'alternative-polyline',
        segments: [
          {
            distanceMetres: 10_000,
            beginShapeIndex: 0,
            endShapeIndex: 10,
            roadCategory: 'urban',
            classificationReason: 'urban-density',
          },
          {
            distanceMetres: 10_000,
            beginShapeIndex: 11,
            endShapeIndex: 20,
            roadCategory: 'unknown',
            classificationReason: 'insufficient-data',
          },
        ],
      },
    ],
  } satisfies Awaited<ReturnType<RoutingProvider['calculateRoutes']>>;
}
