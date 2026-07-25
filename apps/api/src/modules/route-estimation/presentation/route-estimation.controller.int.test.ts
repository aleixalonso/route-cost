import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import routePrimaryFixture from '../../../../test/fixtures/valhalla/route-primary.json';
import traceMixedRouteFixture from '../../../../test/fixtures/valhalla/trace-mixed-route.json';

let app: NestFastifyApplication | undefined;

describe('RouteEstimationController HTTP', () => {
  afterEach(async () => {
    await app?.close();
    app = undefined;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses the mock provider by default', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await postRoute();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      alternatives: [
        {
          id: 'primary',
          distanceMetres: 12_500,
          summary: {
            urbanDistanceMetres: 7_500,
            motorwayDistanceMetres: 5_000,
          },
        },
      ],
    });
  }, 10_000);

  it('selects the Valhalla provider through configuration', async () => {
    useValhallaEnvironment();
    mockValhallaFetch();
    app = await createTestApp();

    const response = await postRoute();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      alternatives: [
        {
          id: 'primary',
          distanceMetres: 10_000,
          summary: {
            urbanDistanceMetres: 2_000,
            interurbanDistanceMetres: 3_000,
            motorwayDistanceMetres: 5_000,
          },
        },
      ],
    });
  });

  it('resolves maxi-scooter to the motorcycle Valhalla profile', async () => {
    useValhallaEnvironment();
    const fetchMock = mockValhallaFetch();
    app = await createTestApp();

    await postRoute({ vehicleCategory: 'maxi-scooter' });

    expect(
      JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string),
    ).toMatchObject({
      costing: 'motorcycle',
    });
  });

  it.each([
    ['invalid latitude', { origin: { latitude: 91, longitude: 2.154 } }],
    ['invalid longitude', { origin: { latitude: 41.3902, longitude: 181 } }],
    [
      'identical origin and destination',
      {
        origin: { latitude: 41.3902, longitude: 2.154 },
        destination: { latitude: 41.3902, longitude: 2.154 },
      },
    ],
    ['unsupported vehicle category', { vehicleCategory: 'bicycle' }],
  ])('returns 400 for %s', async (_name, patch) => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await postRoute(patch);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: 'INVALID_ROUTE_REQUEST',
    });
  });

  it.each([
    [
      404,
      { error: 'No route found.', error_code: 'no_route' },
      404,
      'ROUTE_NOT_FOUND',
    ],
    [408, undefined, 504, 'ROUTING_PROVIDER_TIMEOUT'],
    [
      429,
      { error: 'Rate limit exceeded.', error_code: 'rate_limited' },
      503,
      'ROUTING_PROVIDER_RATE_LIMITED',
    ],
    [
      200,
      { edges: [{ length: 'bad' }] },
      502,
      'ROUTING_PROVIDER_INVALID_RESPONSE',
    ],
  ])(
    'maps provider response status %s to application status %s',
    async (upstreamStatus, upstreamBody, expectedStatus, code) => {
      useValhallaEnvironment();
      if (upstreamStatus === 408) {
        vi.stubGlobal(
          'fetch',
          vi.fn((_url, init: RequestInit | undefined) => {
            init?.signal?.addEventListener('abort', () => undefined);
            return Promise.reject(new DOMException('Aborted', 'AbortError'));
          }),
        );
      } else if (upstreamStatus === 200) {
        vi.stubGlobal(
          'fetch',
          vi
            .fn()
            .mockResolvedValueOnce(jsonResponse(routePrimaryFixture, 200))
            .mockResolvedValueOnce(jsonResponse(upstreamBody, 200)),
        );
      } else {
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue(jsonResponse(upstreamBody, upstreamStatus)),
        );
      }
      app = await createTestApp();

      const response = await postRoute();

      expect(response.statusCode).toBe(expectedStatus);
      expect(response.json()).toMatchObject({ code });
      expect(response.body).not.toContain('test-valhalla-key');
    },
  );

  it('returns the normal 404 response for unknown application routes', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await app.inject('/api/v1/missing');

    expect(response.statusCode).toBe(404);
  });
});

function useMockEnvironment(): void {
  vi.stubEnv('ROUTING_PROVIDER', 'mock');
  vi.stubEnv('SWAGGER_ENABLED', 'false');
}

function useValhallaEnvironment(): void {
  vi.stubEnv('ROUTING_PROVIDER', 'valhalla');
  vi.stubEnv('VALHALLA_API_KEY', 'test-valhalla-key');
  vi.stubEnv('SWAGGER_ENABLED', 'false');
}

async function createTestApp(): Promise<NestFastifyApplication> {
  vi.resetModules();
  const appModule = await import('../../../create-app.js');
  return appModule.createApp();
}

async function postRoute(patch: Record<string, unknown> = {}) {
  if (!app) {
    throw new Error('App not initialized.');
  }

  return app.inject({
    method: 'POST',
    url: '/api/v1/routes',
    payload: {
      origin: { latitude: 41.3902, longitude: 2.154 },
      destination: { latitude: 41.5912, longitude: 1.5209 },
      vehicleCategory: 'maxi-scooter',
      alternatives: 1,
      ...patch,
    },
  });
}

function mockValhallaFetch() {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(jsonResponse(routePrimaryFixture, 200))
    .mockResolvedValueOnce(jsonResponse(traceMixedRouteFixture, 200));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
