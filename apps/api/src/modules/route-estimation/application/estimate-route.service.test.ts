import type { RoutingProvider } from '@route-cost/routing';
import { describe, expect, it, vi } from 'vitest';

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
              distanceMetres: 10_000,
              durationSeconds: 600,
              encodedPolyline: 'encoded',
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
              ],
            },
          ],
        };
      },
    };

    const result = await new EstimateRouteService(provider).estimate({
      origin: { latitude: 41.38, longitude: 2.17 },
      destination: { latitude: 41.4, longitude: 2.19 },
      vehicleCategory: 'maxi-scooter',
      alternatives: 1,
    });

    expect(called).toBe(true);
    expect(result.alternatives[0]).toMatchObject({
      distanceMetres: 10_000,
      summary: {
        urbanDistanceMetres: 10_000,
        interurbanDistanceMetres: 0,
        motorwayDistanceMetres: 0,
        unknownDistanceMetres: 0,
      },
    });
  });

  it('omits the alternatives preference when the request leaves it out', async () => {
    const calculateRoutes = vi.fn(async () => ({ alternatives: [] }));
    const service = new EstimateRouteService({ calculateRoutes });
    const origin = { latitude: 41.38, longitude: 2.17 };
    const destination = { latitude: 41.4, longitude: 2.19 };

    await expect(
      service.estimate({ origin, destination, vehicleCategory: 'car' }),
    ).resolves.toEqual({ alternatives: [] });
    expect(calculateRoutes).toHaveBeenCalledWith({
      origin,
      destination,
      vehicleCategory: 'car',
    });
  });
});
