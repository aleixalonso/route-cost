import {
  DEFAULT_ROUTE_PREFERENCES,
  type RoutingProvider,
} from '@route-cost/routing';
import { RoutingProviderTimeoutError } from '@route-cost/routing';
import { describe, expect, it, vi } from 'vitest';

import type {
  ResolvedVehicleSelection,
  ResolveVehicleSelectionService,
} from '../../vehicles/application/resolve-vehicle-selection.service';
import { VehicleNotFoundApplicationError } from '../../vehicles/application/vehicle-not-found.error';
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
  it('calls the provider exactly once with default preferences when omitted', async () => {
    const calculateRoutes = vi.fn().mockResolvedValue(routes());
    const provider: RoutingProvider = { calculateRoutes };

    const result = await service(provider).estimate(request);

    expect(calculateRoutes).toHaveBeenCalledOnce();
    expect(calculateRoutes).toHaveBeenCalledWith({
      origin: request.origin,
      destination: request.destination,
      vehicleCategory: 'maxi-scooter',
      preferences: DEFAULT_ROUTE_PREFERENCES,
      alternatives: 1,
    });
    expect(result.routePreferences).toEqual(DEFAULT_ROUTE_PREFERENCES);
  });

  it('omits the alternatives preference when the request leaves it out', async () => {
    const calculateRoutes = vi.fn().mockResolvedValue(routes());
    const provider: RoutingProvider = { calculateRoutes };
    const result = await service(provider).estimate({
      origin: request.origin,
      destination: request.destination,
      vehicleCategory: request.vehicleCategory,
      consumptionProfile: request.consumptionProfile,
      fuelPrice: request.fuelPrice,
    });

    expect(result.alternatives).toHaveLength(2);
    expect(calculateRoutes).toHaveBeenCalledWith({
      origin: request.origin,
      destination: request.destination,
      vehicleCategory: request.vehicleCategory,
      preferences: DEFAULT_ROUTE_PREFERENCES,
    });
  });

  it('normalizes partial preferences before calling the provider', async () => {
    const calculateRoutes = vi.fn().mockResolvedValue(routes());
    const provider: RoutingProvider = { calculateRoutes };

    const result = await service(provider).estimate({
      ...request,
      routePreferences: { avoidTolls: true },
    });

    expect(calculateRoutes).toHaveBeenCalledWith(
      expect.objectContaining({
        preferences: {
          avoidTolls: true,
          avoidMotorways: false,
          avoidFerries: false,
          priority: 'fastest',
        },
      }),
    );
    expect(result.routePreferences).toEqual({
      avoidTolls: true,
      avoidMotorways: false,
      avoidFerries: false,
      priority: 'fastest',
    });
  });

  it('passes complete preferences through unchanged', async () => {
    const calculateRoutes = vi.fn().mockResolvedValue(routes());
    const provider: RoutingProvider = { calculateRoutes };
    const preferences = {
      avoidTolls: true,
      avoidMotorways: true,
      avoidFerries: false,
      priority: 'shortest',
    } as const;

    await service(provider).estimate({
      ...request,
      routePreferences: preferences,
    });

    expect(calculateRoutes).toHaveBeenCalledWith(
      expect.objectContaining({ preferences }),
    );
  });

  it('estimates one route alternative correctly', async () => {
    const result = await service(provider()).estimate(request);

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
    const result = await service(provider()).estimate(request);

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
    const result = await service(provider()).estimate({
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

    await expect(service(provider).estimate(request)).rejects.toBe(error);
  });

  it('preserves provider-neutral segment data without provider-specific transformation', async () => {
    const result = await service(provider()).estimate(request);

    expect(result.alternatives[0]?.segments[0]).toEqual({
      distanceMetres: 10_000,
      beginShapeIndex: 0,
      endShapeIndex: 10,
      roadCategory: 'urban',
      classificationReason: 'urban-density',
      isToll: false,
      isFerry: false,
      expectedSpeedKmh: 28,
      speedLimitKmh: 30,
      roadClass: 'primary',
      density: 11,
    });
  });

  it('derives characteristics from the traced segments of each alternative', async () => {
    const result = await service(provider()).estimate(request);

    expect(result.alternatives[0]?.routeCharacteristics).toEqual({
      tolls: {
        status: 'known',
        present: true,
        distanceMetres: 30_000,
        segmentCount: 1,
      },
      motorways: {
        status: 'known',
        present: true,
        distanceMetres: 30_000,
        segmentCount: 1,
      },
      ferries: {
        status: 'known',
        present: false,
        distanceMetres: 0,
        segmentCount: 0,
      },
    });
    expect(result.alternatives[1]?.routeCharacteristics).toEqual({
      tolls: {
        status: 'known',
        present: false,
        distanceMetres: 0,
        segmentCount: 0,
      },
      motorways: {
        status: 'known',
        present: false,
        distanceMetres: 0,
        segmentCount: 0,
      },
      ferries: {
        status: 'known',
        present: false,
        distanceMetres: 0,
        segmentCount: 0,
      },
    });
  });

  it('gives every alternative independent compliance data', async () => {
    const result = await service(provider()).estimate({
      ...request,
      routePreferences: { avoidTolls: true, avoidMotorways: true },
    });

    expect(result.alternatives[0]?.preferenceCompliance).toEqual({
      conflicts: ['tolls-present', 'motorways-present'],
    });
    expect(result.alternatives[1]?.preferenceCompliance).toEqual({
      conflicts: [],
    });
  });

  it('reports no conflicts when no avoidance preference is set', async () => {
    const result = await service(provider()).estimate(request);

    expect(result.alternatives[0]?.preferenceCompliance).toEqual({
      conflicts: [],
    });
  });

  it('keeps toll distance separate from the fuel formula', async () => {
    const result = await service(provider()).estimate(request);

    expect(result.alternatives[0]?.fuelEstimate.totalLitres).toBeCloseTo(2.7);
    expect(result.alternatives[0]?.costEstimate.estimatedCost).toBeCloseTo(
      4.32,
    );
    expect(result.alternatives[0]?.routeCharacteristics.tolls).toMatchObject({
      present: true,
      distanceMetres: 30_000,
    });
    expect(result.alternatives[0]).not.toHaveProperty('tollCost');
    expect(
      (result.alternatives[0] as { costEstimate?: { tollCost?: unknown } })
        .costEstimate,
    ).not.toHaveProperty('tollCost');
  });

  it('uses catalog category and consumption profile for routing and calculation', async () => {
    const calculateRoutes = vi.fn().mockResolvedValue(routes());
    const provider: RoutingProvider = { calculateRoutes };
    const result = await service(provider, {
      source: 'catalog',
      vehicleId: 'honda-forza-350-2025',
      displayName: 'Honda Forza 350',
      vehicleCategory: 'maxi-scooter',
      fuelType: 'petrol',
      powertrainType: 'internal-combustion',
      consumptionProfile: {
        urbanLitresPer100Km: 3.7,
        interurbanLitresPer100Km: 3.1,
        motorwayLitresPer100Km: 4,
        unknownLitresPer100Km: 3.4,
      },
      consumptionData: { status: 'estimated', confidence: 'medium' },
    }).estimate({
      origin: request.origin,
      destination: request.destination,
      vehicleId: 'honda-forza-350-2025',
      fuelPrice: request.fuelPrice,
      alternatives: 1,
    });

    expect(calculateRoutes).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleCategory: 'maxi-scooter' }),
    );
    expect(result.vehicle).toMatchObject({
      source: 'catalog',
      vehicleId: 'honda-forza-350-2025',
      displayName: 'Honda Forza 350',
    });
    expect(
      result.alternatives[0]?.fuelEstimate.breakdown.urban.litresPer100Km,
    ).toBe(3.7);
  });

  it('does not call the routing provider when vehicle resolution fails', async () => {
    const calculateRoutes = vi.fn();
    const error = new VehicleNotFoundApplicationError();

    await expect(
      service({ calculateRoutes }, undefined, error).estimate({
        origin: request.origin,
        destination: request.destination,
        vehicleId: 'missing',
        fuelPrice: request.fuelPrice,
      }),
    ).rejects.toBe(error);
    expect(calculateRoutes).not.toHaveBeenCalled();
  });

  it('returns no provider-specific values publicly', async () => {
    const result = await service(provider()).estimate(request);

    expect(result).not.toHaveProperty('use_tolls');
    expect(result).not.toHaveProperty('use_highways');
    expect(result).not.toHaveProperty('use_ferry');
    expect(result).not.toHaveProperty('use_distance');
    expect(result).not.toHaveProperty('shortest');
    expect(JSON.stringify(result)).not.toContain('use_tolls');
    expect(JSON.stringify(result)).not.toContain('costing_options');
  });
});

function provider(): RoutingProvider {
  return {
    calculateRoutes: vi.fn().mockResolvedValue(routes()),
  };
}

function service(
  routingProvider: RoutingProvider,
  resolvedVehicle: ResolvedVehicleSelection = {
    source: 'custom',
    vehicleCategory: request.vehicleCategory,
    consumptionProfile: request.consumptionProfile,
  },
  error?: Error,
): EstimateRouteCostService {
  const resolver = {
    resolve: vi.fn(() => {
      if (error !== undefined) {
        throw error;
      }

      return resolvedVehicle;
    }),
  } as unknown as ResolveVehicleSelectionService;

  return new EstimateRouteCostService(routingProvider, resolver);
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
            isToll: false,
            isFerry: false,
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
            isToll: false,
            isFerry: false,
          },
          {
            distanceMetres: 30_000,
            beginShapeIndex: 21,
            endShapeIndex: 30,
            roadCategory: 'motorway',
            classificationReason: 'road-class-motorway',
            isToll: true,
            isFerry: false,
          },
          {
            distanceMetres: 5_000,
            beginShapeIndex: 31,
            endShapeIndex: 35,
            roadCategory: 'unknown',
            classificationReason: 'insufficient-data',
            isToll: false,
            isFerry: false,
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
            isToll: false,
            isFerry: false,
          },
          {
            distanceMetres: 10_000,
            beginShapeIndex: 11,
            endShapeIndex: 20,
            roadCategory: 'unknown',
            classificationReason: 'insufficient-data',
            isToll: false,
            isFerry: false,
          },
        ],
      },
    ],
  } satisfies Awaited<ReturnType<RoutingProvider['calculateRoutes']>>;
}
