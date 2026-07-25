import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../../create-app';

describe('RouteEstimationController HTTP', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects invalid payloads', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/route-estimates',
      payload: {
        origin: { latitude: 999, longitude: 2.17 },
        destination: { latitude: 41.4, longitude: 2.19 },
        vehicleId: 'compact-petrol',
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
