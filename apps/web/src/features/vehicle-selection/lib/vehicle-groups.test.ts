import { describe, expect, it } from 'vitest';

import { groupVehicles } from './vehicle-groups';

const baseVehicle = {
  manufacturer: 'Test',
  model: 'Model',
  variant: 'Variant',
  yearFrom: 2025,
  fuelType: 'petrol',
  powertrainType: 'internal-combustion',
  consumptionProfile: {
    urbanLitresPer100Km: 4,
    interurbanLitresPer100Km: 3,
    motorwayLitresPer100Km: 5,
    unknownLitresPer100Km: 4,
  },
  consumptionData: { status: 'estimated', confidence: 'medium' },
} as const;

describe('groupVehicles', () => {
  it('groups cars and motorcycle categories in stable order', () => {
    const groups = groupVehicles([
      {
        ...baseVehicle,
        id: 'car-b',
        displayName: 'Volkswagen Golf',
        vehicleCategory: 'car',
      },
      {
        ...baseVehicle,
        id: 'maxi-a',
        displayName: 'Honda Forza',
        vehicleCategory: 'maxi-scooter',
      },
      {
        ...baseVehicle,
        id: 'motorcycle-a',
        displayName: 'Honda NX500',
        vehicleCategory: 'motorcycle',
      },
      {
        ...baseVehicle,
        id: 'scooter-a',
        displayName: 'Low Scooter',
        vehicleCategory: 'low-speed-scooter',
      },
    ]);

    expect(groups.map((group) => group.label)).toEqual(['Motorcycles', 'Cars']);
    expect(groups[0]?.vehicles.map((vehicle) => vehicle.id)).toEqual([
      'maxi-a',
      'motorcycle-a',
      'scooter-a',
    ]);
    expect(groups[1]?.vehicles.map((vehicle) => vehicle.id)).toEqual(['car-b']);
  });
});
