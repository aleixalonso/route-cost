import type { RoutePreferences } from '@route-cost/contracts';
import { describe, expect, it } from 'vitest';

import { buildRouteCostEstimateRequest } from './build-route-cost-estimate-request';

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

const consumptionProfile = {
  urbanLitresPer100Km: 3.8,
  interurbanLitresPer100Km: 3,
  motorwayLitresPer100Km: 4.1,
  unknownLitresPer100Km: 3.4,
};

const defaultRoutePreferences = {
  avoidTolls: false,
  avoidMotorways: false,
  avoidFerries: false,
  priority: 'fastest',
} as const;

describe('buildRouteCostEstimateRequest', () => {
  it('maps catalog mode and omits custom fields', () => {
    const request = buildRouteCostEstimateRequest({
      mode: 'catalog',
      origin,
      destination,
      vehicleId: 'honda-forza-350-2025',
      fuelPrice: 1.6,
      routePreferences: defaultRoutePreferences,
    });

    expect(request).toEqual({
      origin: origin.coordinate,
      destination: destination.coordinate,
      vehicleId: 'honda-forza-350-2025',
      fuelPrice: { amountPerLitre: 1.6, currency: 'EUR' },
      routePreferences: defaultRoutePreferences,
      alternatives: 1,
    });
    expect('vehicleCategory' in request).toBe(false);
    expect('consumptionProfile' in request).toBe(false);
  });

  it('maps custom mode and omits vehicleId', () => {
    const request = buildRouteCostEstimateRequest({
      mode: 'custom',
      origin,
      destination,
      vehicleCategory: 'maxi-scooter',
      consumptionProfile,
      fuelPrice: 1.7,
      routePreferences: defaultRoutePreferences,
    });

    expect(request).toEqual({
      origin: origin.coordinate,
      destination: destination.coordinate,
      vehicleCategory: 'maxi-scooter',
      consumptionProfile,
      fuelPrice: { amountPerLitre: 1.7, currency: 'EUR' },
      routePreferences: defaultRoutePreferences,
      alternatives: 1,
    });
    expect('vehicleId' in request).toBe(false);
  });

  it.each<readonly [string, Partial<RoutePreferences>]>([
    ['avoid tolls', { avoidTolls: true }],
    ['avoid motorways', { avoidMotorways: true }],
    ['avoid ferries', { avoidFerries: true }],
    ['fastest', { priority: 'fastest' }],
    ['shortest', { priority: 'shortest' }],
    [
      'all options',
      {
        avoidTolls: true,
        avoidMotorways: true,
        avoidFerries: true,
        priority: 'shortest',
      },
    ],
  ])('maps %s', (_name, patch) => {
    const request = buildRouteCostEstimateRequest({
      mode: 'catalog',
      origin,
      destination,
      vehicleId: 'honda-forza-350-2025',
      fuelPrice: 1.6,
      routePreferences: {
        ...defaultRoutePreferences,
        ...patch,
      },
    });

    expect(request.routePreferences).toMatchObject(patch);
    expect(request.routePreferences).not.toBeUndefined();
  });

  it('never includes provider-specific values', () => {
    const request = buildRouteCostEstimateRequest({
      mode: 'catalog',
      origin,
      destination,
      vehicleId: 'honda-forza-350-2025',
      fuelPrice: 1.6,
      routePreferences: {
        avoidTolls: true,
        avoidMotorways: false,
        avoidFerries: false,
        priority: 'fastest',
      },
    });

    const serialized = JSON.stringify(request);
    expect(serialized).not.toContain('use_tolls');
    expect(serialized).not.toContain('use_highways');
    expect(serialized).not.toContain('use_ferry');
    expect(serialized).not.toContain('use_distance');
  });

  it('keeps the custom fuel product omitted from the route-cost request', () => {
    const request = buildRouteCostEstimateRequest({
      mode: 'custom',
      origin,
      destination,
      vehicleCategory: 'maxi-scooter',
      fuelProduct: 'petrol-95-e5',
      consumptionProfile,
      fuelPrice: 1.7,
      routePreferences: defaultRoutePreferences,
    });

    expect(request).not.toHaveProperty('fuelProduct');
  });
});
