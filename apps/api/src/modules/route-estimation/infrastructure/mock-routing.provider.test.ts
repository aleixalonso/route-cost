import { describe, expect, it } from 'vitest';

import { MockRoutingProvider } from './mock-routing.provider';

describe('MockRoutingProvider', () => {
  it('returns deterministic provider-neutral route data', async () => {
    await expect(
      new MockRoutingProvider().calculateRoutes({
        origin: { latitude: 41.38, longitude: 2.17 },
        destination: { latitude: 41.4, longitude: 2.19 },
        vehicleCategory: 'car',
      }),
    ).resolves.toMatchObject({
      alternatives: [{ id: 'primary', distanceMetres: 12_500 }],
    });
  });
});
