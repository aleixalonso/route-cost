import { describe, expect, it } from 'vitest';

import { getVehicleById, listVehicles } from './index.js';

describe('vehicle data', () => {
  it('lists estimated sample vehicles', () => {
    expect(listVehicles()).toHaveLength(2);
    expect(listVehicles()[0]?.dataQuality).toBe(
      'estimated - not verified for production',
    );
  });

  it('retrieves vehicles by id', () => {
    expect(getVehicleById('compact-petrol')?.name).toBe('Compact petrol car');
    expect(getVehicleById('missing')).toBeUndefined();
  });
});
