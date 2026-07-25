import { describe, expect, it } from 'vitest';

import type { RoutingProvider } from './index.js';

describe('RoutingProvider', () => {
  it('allows provider-neutral route calculation implementations', async () => {
    const provider: RoutingProvider = {
      async calculateRoutes() {
        return {
          alternatives: [
            {
              id: 'route-a',
              distanceKm: 1,
              durationSeconds: 60,
              segments: [
                { distanceKm: 1, durationSeconds: 60, roadCategory: 'unknown' },
              ],
            },
          ],
        };
      },
    };

    await expect(
      provider.calculateRoutes({
        origin: { latitude: 0, longitude: 0 },
        destination: { latitude: 1, longitude: 1 },
      }),
    ).resolves.toMatchObject({ alternatives: [{ id: 'route-a' }] });
  });
});
