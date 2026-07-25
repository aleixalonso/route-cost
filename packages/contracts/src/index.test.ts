import { describe, expect, it } from 'vitest';

import { estimateRouteRequestSchema, healthStatusSchema } from './index.js';

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
