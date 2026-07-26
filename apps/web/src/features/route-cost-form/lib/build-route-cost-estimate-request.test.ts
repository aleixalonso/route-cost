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

describe('buildRouteCostEstimateRequest', () => {
  it('maps catalog mode and omits custom fields', () => {
    const request = buildRouteCostEstimateRequest({
      mode: 'catalog',
      origin,
      destination,
      vehicleId: 'honda-forza-350-2025',
      fuelPrice: 1.6,
    });

    expect(request).toEqual({
      origin: origin.coordinate,
      destination: destination.coordinate,
      vehicleId: 'honda-forza-350-2025',
      fuelPrice: { amountPerLitre: 1.6, currency: 'EUR' },
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
    });

    expect(request).toEqual({
      origin: origin.coordinate,
      destination: destination.coordinate,
      vehicleCategory: 'maxi-scooter',
      consumptionProfile,
      fuelPrice: { amountPerLitre: 1.7, currency: 'EUR' },
      alternatives: 1,
    });
    expect('vehicleId' in request).toBe(false);
  });
});
