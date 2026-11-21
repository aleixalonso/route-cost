import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

let app: NestFastifyApplication | undefined;

afterEach(async () => {
  try {
    await app?.close();
  } finally {
    app = undefined;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  }
});

describe('HTTP error envelope', () => {
  it('normalizes validation errors', async () => {
    app = await createTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/route-cost-estimates',
      payload: {},
    });
    expectEnvelope(response.json(), 400, 'INVALID_ROUTE_COST_REQUEST');
    expect(response.json().fields.length).toBeGreaterThan(0);
    expect(response.body).not.toContain('stack');
  });

  it('normalizes unknown routes', async () => {
    app = await createTestApp();
    const response = await app.inject('/api/v1/missing');
    expectEnvelope(response.json(), 404, 'NOT_FOUND');
    expect(response.json().fields).toEqual([]);
  });

  it('preserves a mapped provider code', async () => {
    vi.stubEnv('ROUTING_PROVIDER', 'valhalla');
    vi.stubEnv('VALHALLA_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'secret upstream body' }), {
          status: 429,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    app = await createTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/routes',
      payload: {
        origin: { latitude: 41.3902, longitude: 2.154 },
        destination: { latitude: 41.5912, longitude: 1.5209 },
        vehicleCategory: 'maxi-scooter',
        alternatives: 1,
      },
    });
    expectEnvelope(response.json(), 503, 'ROUTING_PROVIDER_RATE_LIMITED');
    expect(response.json().fields).toEqual([]);
    expect(response.body).not.toContain('secret upstream body');
    expect(response.body).not.toContain('test-key');
    expect(response.body).not.toContain('stack');
  });
});

async function createTestApp(): Promise<NestFastifyApplication> {
  vi.stubEnv('SWAGGER_ENABLED', 'false');
  vi.stubEnv('THROTTLING_ENABLED', 'false');
  vi.resetModules();
  const { createApp } = await import('../src/create-app.js');
  return createApp();
}

function expectEnvelope(body: unknown, statusCode: number, code: string): void {
  expect(body).toMatchObject({ statusCode, code });
  expect(body).toBeTypeOf('object');
  if (typeof body !== 'object' || body === null) return;
  expect(Object.keys(body).sort()).toEqual([
    'code',
    'fields',
    'message',
    'statusCode',
  ]);
  if (!('statusCode' in body) || !('fields' in body)) return;
  expect(typeof body.statusCode).toBe('number');
  expect(Array.isArray(body.fields)).toBe(true);
}
