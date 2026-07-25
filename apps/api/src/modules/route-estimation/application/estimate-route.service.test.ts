import type { RoutingProvider } from '@route-cost/routing';
import { describe, expect, it } from 'vitest';

import { EstimateRouteService } from './estimate-route.service';

describe('EstimateRouteService', () => {
  it('uses the injected routing provider', async () => {
    let called = false;
    const provider: RoutingProvider = {
      async calculateRoutes() {
        called = true;
        return {
          alternatives: [
            {
              id: 'test',
              distanceKm: 10,
              durationSeconds: 600,
              segments: [
                { distanceKm: 10, durationSeconds: 600, roadCategory: 'urban' },
              ],
            },
          ],
        };
      },
    };

    const result = await new EstimateRouteService(provider).estimate({
      origin: { latitude: 41.38, longitude: 2.17 },
      destination: { latitude: 41.4, longitude: 2.19 },
      vehicleId: 'compact-petrol',
    });

    expect(called).toBe(true);
    expect(result.distanceKm).toBe(10);
    expect(result.estimatedCost).toBe(1.085);
  });
});
