import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/create-app';

describe('RouteCost API HTTP', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns live health', async () => {
    const response = await app.inject('/api/v1/health/live');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
      service: 'route-cost-api',
    });
  });

  it('returns ready health', async () => {
    const response = await app.inject('/api/v1/health/ready');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
      service: 'route-cost-api',
    });
  });

  it('returns 404 for unknown routes', async () => {
    const response = await app.inject('/api/v1/missing');

    expect(response.statusCode).toBe(404);
  });
});
