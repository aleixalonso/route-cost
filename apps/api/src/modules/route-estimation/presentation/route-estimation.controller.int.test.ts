import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { estimateRouteCostResponseSchema } from '@route-cost/contracts';
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

    const response = await postRoute({ alternatives: 0 });

    expect(response.statusCode).toBe(200);
    expect(response.json().alternatives[0]).toMatchObject({
      id: 'primary',
      distanceMetres: 17_500,
      summary: {
        urbanDistanceMetres: 7_500,
        interurbanDistanceMetres: 5_000,
        motorwayDistanceMetres: 5_000,
      },
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

describe('RouteCostEstimatesController HTTP', () => {
  afterEach(async () => {
    await app?.close();
    app = undefined;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns a valid route cost estimate with route and segment information', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await postRouteCost({ alternatives: 0 });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(() => estimateRouteCostResponseSchema.parse(body)).not.toThrow();
    expect(body.vehicle).toMatchObject({
      source: 'custom',
      vehicleCategory: 'maxi-scooter',
    });
    expect(body.alternatives[0]).toMatchObject({
      id: 'primary',
      distanceMetres: 17_500,
      durationSeconds: 1620,
      encodedPolyline: 'mock-polyline',
      summary: {
        urbanDistanceMetres: 7_500,
        interurbanDistanceMetres: 5_000,
        motorwayDistanceMetres: 5_000,
        unknownDistanceMetres: 0,
      },
      fuelEstimate: {
        breakdown: {
          urban: {
            distanceMetres: 7_500,
            litresPer100Km: 3.8,
          },
          interurban: {
            distanceMetres: 5_000,
            litresPer100Km: 3,
          },
          motorway: {
            distanceMetres: 5_000,
            litresPer100Km: 4.1,
          },
          unknown: {
            distanceMetres: 0,
            litresPer100Km: 3.4,
            estimatedLitres: 0,
          },
        },
      },
      costEstimate: {
        fuelPrice: {
          amountPerLitre: 1.6,
          currency: 'EUR',
        },
      },
    });
    expect(body.alternatives[0].segments[0]).toMatchObject({
      distanceMetres: 7_500,
      beginShapeIndex: 0,
      endShapeIndex: 12,
      roadCategory: 'urban',
      classificationReason: 'urban-density',
    });
    expect(
      body.alternatives[0].fuelEstimate.breakdown.urban.estimatedLitres,
    ).toBeCloseTo(0.285);
    expect(
      body.alternatives[0].fuelEstimate.breakdown.interurban.estimatedLitres,
    ).toBeCloseTo(0.15);
    expect(
      body.alternatives[0].fuelEstimate.breakdown.motorway.estimatedLitres,
    ).toBeCloseTo(0.205);
    expect(body.alternatives[0].fuelEstimate.totalLitres).toBeCloseTo(0.64);
    expect(body.alternatives[0].costEstimate.estimatedCost).toBeCloseTo(1.024);
  });

  it('supports catalog vehicle mode', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await postRouteCost({
      vehicleId: 'honda-forza-350-2025',
      vehicleCategory: undefined,
      consumptionProfile: undefined,
      alternatives: 0,
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.vehicle).toMatchObject({
      source: 'catalog',
      vehicleId: 'honda-forza-350-2025',
      displayName: 'Honda Forza 350',
      vehicleCategory: 'maxi-scooter',
      fuelType: 'petrol',
      powertrainType: 'internal-combustion',
      consumptionData: { status: 'estimated', confidence: 'medium' },
    });
    expect(body.vehicle.consumptionProfile.urbanLitresPer100Km).toBe(3.7);
    expect(
      body.alternatives[0].fuelEstimate.breakdown.urban.litresPer100Km,
    ).toBe(3.7);
  });

  it('returns 404 for unknown catalog vehicles before routing', async () => {
    useValhallaEnvironment();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    app = await createTestApp();

    const response = await postRouteCost({
      vehicleId: 'missing-vehicle',
      vehicleCategory: undefined,
      consumptionProfile: undefined,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'VEHICLE_NOT_FOUND' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns multiple route cost estimates in provider order', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await postRouteCost({ alternatives: 2 });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(
      body.alternatives.map((alternative: { id: string }) => alternative.id),
    ).toEqual(['primary', 'alternative-1', 'alternative-2']);
    expect(body.alternatives).toHaveLength(3);
    expect(body.alternatives[1].fuelEstimate.totalLitres).toBeGreaterThan(0);
    expect(body.alternatives[2].costEstimate.estimatedCost).toBeGreaterThan(0);
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
    [
      'missing consumption category',
      {
        consumptionProfile: {
          urbanLitresPer100Km: 3.8,
          interurbanLitresPer100Km: 3,
          motorwayLitresPer100Km: 4.1,
        },
      },
    ],
    [
      'zero consumption rate',
      { consumptionProfile: { urbanLitresPer100Km: 0 } },
    ],
    [
      'negative consumption rate',
      { consumptionProfile: { urbanLitresPer100Km: -1 } },
    ],
    [
      'excessive consumption rate',
      { consumptionProfile: { urbanLitresPer100Km: 101 } },
    ],
    ['missing fuel price', { fuelPrice: undefined }],
    ['zero fuel price', { fuelPrice: { amountPerLitre: 0, currency: 'EUR' } }],
    [
      'invalid currency',
      { fuelPrice: { amountPerLitre: 1.6, currency: 'eur' } },
    ],
    ['invalid alternatives', { alternatives: 3 }],
    [
      'no vehicle selection',
      { vehicleCategory: undefined, consumptionProfile: undefined },
    ],
    [
      'catalog and custom selection together',
      { vehicleId: 'honda-forza-350-2025' },
    ],
    ['category without profile', { consumptionProfile: undefined }],
    ['profile without category', { vehicleCategory: undefined }],
  ])('returns 400 for %s', async (_name, patch) => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await postRouteCost(patch);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: 'INVALID_ROUTE_COST_REQUEST',
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
      } else {
        vi.stubGlobal(
          'fetch',
          vi.fn().mockResolvedValue(jsonResponse(upstreamBody, upstreamStatus)),
        );
      }
      app = await createTestApp();

      const response = await postRouteCost();

      expect(response.statusCode).toBe(expectedStatus);
      expect(response.json()).toMatchObject({ code });
      expect(response.body).not.toContain('test-valhalla-key');
    },
  );

  it('keeps the existing route endpoint compatible', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await postRoute({ alternatives: 0 });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      alternatives: [{ id: 'primary', encodedPolyline: 'mock-polyline' }],
    });
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

async function postRouteCost(patch: Record<string, unknown> = {}) {
  if (!app) {
    throw new Error('App not initialized.');
  }

  const payload = {
    origin: { latitude: 41.3902, longitude: 2.154 },
    destination: { latitude: 41.5912, longitude: 1.5209 },
    vehicleCategory: 'maxi-scooter',
    consumptionProfile: {
      urbanLitresPer100Km: 3.8,
      interurbanLitresPer100Km: 3,
      motorwayLitresPer100Km: 4.1,
      unknownLitresPer100Km: 3.4,
    },
    fuelPrice: {
      amountPerLitre: 1.6,
      currency: 'EUR',
    },
    alternatives: 1,
    ...patch,
  };

  return app.inject({
    method: 'POST',
    url: '/api/v1/route-cost-estimates',
    payload,
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
