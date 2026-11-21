import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

describe('route cost throttling', () => {
  let app: NestFastifyApplication | undefined;

  beforeAll(async () => {
    app = await createMockApp();
  });

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('limits expensive route cost requests globally', async () => {
    for (let requestNumber = 0; requestNumber < 10; requestNumber += 1) {
      const response = await injectEstimate(app);
      expect(response.statusCode).toBe(200);
    }

    const response = await injectEstimate(app);
    expect(response.statusCode).toBe(429);
  });
});

describe('route cost throttling behind a trusted proxy', () => {
  let app: NestFastifyApplication | undefined;

  beforeAll(async () => {
    vi.stubEnv('TRUST_PROXY', 'true');
    app = await createMockApp();
  });

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('uses a separate throttle bucket for each forwarded client address', async () => {
    for (let requestNumber = 1; requestNumber <= 11; requestNumber += 1) {
      const response = await injectEstimate(app, `203.0.113.${requestNumber}`);
      expect(response.statusCode).toBe(200);
    }
  });
});

describe('route cost throttling disabled for the browser harness', () => {
  let app: NestFastifyApplication | undefined;

  beforeAll(async () => {
    vi.stubEnv('THROTTLING_ENABLED', 'false');
    app = await createMockApp();
  });

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('allows more requests than the production limit', async () => {
    for (let requestNumber = 0; requestNumber < 12; requestNumber += 1) {
      const response = await injectEstimate(app);
      expect(response.statusCode).toBe(200);
    }
  });
});

async function createMockApp(): Promise<NestFastifyApplication> {
  vi.stubEnv('ROUTING_PROVIDER', 'mock');
  vi.stubEnv('GEOCODING_PROVIDER', 'mock');
  vi.stubEnv('FUEL_PRICE_PROVIDER_MODE', 'mock');
  vi.stubEnv('SWAGGER_ENABLED', 'false');
  vi.resetModules();
  const { createApp } = await import('../src/create-app.js');
  return createApp();
}

function buildEstimatePayload() {
  return {
    origin: { latitude: 41.3902, longitude: 2.154 },
    destination: { latitude: 41.5912, longitude: 1.5209 },
    vehicleId: 'honda-forza-350-2025',
    fuelPrice: { amountPerLitre: 1.6, currency: 'EUR' },
    alternatives: 1,
  };
}

function injectEstimate(
  app: NestFastifyApplication | undefined,
  forwardedFor?: string,
) {
  if (!app) {
    throw new Error('App not initialized.');
  }

  return app.inject({
    method: 'POST',
    url: '/api/v1/route-cost-estimates',
    payload: buildEstimatePayload(),
    ...(forwardedFor ? { headers: { 'x-forwarded-for': forwardedFor } } : {}),
  });
}
