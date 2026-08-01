import { VersioningType } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import {
  type EstimateRouteCostRequest,
  estimateRouteCostResponseSchema,
} from '@route-cost/contracts';
import {
  DEFAULT_ROUTE_PREFERENCES,
  type RouteAlternative,
  type RoutingProvider,
  type RoutingRequest,
} from '@route-cost/routing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../../../app.module';
import { ROUTING_PROVIDER } from '../application/routing-provider.token';
import { MockRoutingProvider } from '../infrastructure/mock-routing.provider';

let app: NestFastifyApplication | undefined;

describe('RouteCostEstimatesController preferences HTTP', () => {
  afterEach(async () => {
    await app?.close();
    app = undefined;
    vi.unstubAllEnvs();
  });

  it('returns normalized default preferences when the request omits them', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await postRouteCost();
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.routePreferences).toEqual(DEFAULT_ROUTE_PREFERENCES);
  });

  it('returns normalized preferences for a partial object', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await postRouteCost({
      routePreferences: { avoidTolls: true },
    });
    const body = response.json();

    expect(body.routePreferences).toEqual({
      avoidTolls: true,
      avoidMotorways: false,
      avoidFerries: false,
      priority: 'fastest',
    });
  });

  it('returns an empty preference object normalized to defaults', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await postRouteCost({ routePreferences: {} });
    const body = response.json();

    expect(body.routePreferences).toEqual(DEFAULT_ROUTE_PREFERENCES);
  });

  it('describes the default route with tolls, motorways, and no ferries', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await postRouteCost({ alternatives: 0 });
    const body = response.json();

    expect(body.alternatives[0]?.routeCharacteristics).toEqual({
      tolls: {
        status: 'known',
        present: true,
        distanceMetres: 5_000,
        segmentCount: 1,
      },
      motorways: {
        status: 'known',
        present: true,
        distanceMetres: 5_000,
        segmentCount: 1,
      },
      ferries: {
        status: 'known',
        present: false,
        distanceMetres: 0,
        segmentCount: 0,
      },
    });
    expect(body.alternatives[0]?.preferenceCompliance).toEqual({
      conflicts: [],
    });
  });

  it('reports an unavoidable toll conflict when avoidTolls is requested', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await postRouteCost({
      routePreferences: { avoidTolls: true },
      alternatives: 0,
    });
    const body = response.json();

    expect(body.alternatives[0]?.routeCharacteristics.tolls).toMatchObject({
      status: 'known',
      present: true,
      distanceMetres: 5_000,
    });
    expect(body.alternatives[0]?.preferenceCompliance).toEqual({
      conflicts: ['tolls-present'],
    });
  });

  it('avoids motorways when requested and reports compliance', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await postRouteCost({
      routePreferences: { avoidMotorways: true },
      alternatives: 0,
    });
    const body = response.json();

    expect(body.alternatives[0]?.routeCharacteristics.motorways).toMatchObject({
      status: 'known',
      present: false,
      distanceMetres: 0,
    });
    expect(body.alternatives[0]?.preferenceCompliance).toEqual({
      conflicts: [],
    });
  });

  it('reports an unavoidable ferry conflict when avoidFerries is requested', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await postRouteCost({
      routePreferences: { avoidFerries: true },
      alternatives: 0,
    });
    const body = response.json();

    expect(body.alternatives[0]?.routeCharacteristics.ferries).toMatchObject({
      status: 'known',
      present: true,
      distanceMetres: 2_000,
    });
    expect(body.alternatives[0]?.preferenceCompliance).toEqual({
      conflicts: ['ferries-present'],
    });
  });

  it('reports independent characteristics for every alternative', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await postRouteCost({
      routePreferences: { avoidTolls: true },
      alternatives: 2,
    });
    const body = response.json();

    const [primary, tollFree, ferryAlternative] = body.alternatives;

    expect(primary?.routeCharacteristics.tolls).toMatchObject({
      present: true,
    });
    expect(tollFree?.routeCharacteristics.tolls).toMatchObject({
      present: false,
    });
    expect(primary?.preferenceCompliance).toEqual({
      conflicts: ['tolls-present'],
    });
    expect(tollFree?.preferenceCompliance).toEqual({ conflicts: [] });
    expect(ferryAlternative?.routeCharacteristics.ferries).toMatchObject({
      present: true,
    });
  });

  it('never returns a monetary toll amount', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await postRouteCost();
    const body = response.json();

    expect(JSON.stringify(body)).not.toContain('tollCost');
    expect(JSON.stringify(body)).not.toContain('tollPrice');
    expect(body.alternatives[0]?.routeCharacteristics.tolls).not.toHaveProperty(
      'cost',
    );
  });

  it('validates the response schema for every preference combination', async () => {
    useMockEnvironment();
    app = await createTestApp();

    for (const routePreferences of [
      undefined,
      {},
      { avoidTolls: true },
      { avoidMotorways: true },
      { avoidFerries: true },
      { priority: 'shortest' },
      {
        avoidTolls: true,
        avoidMotorways: true,
        avoidFerries: true,
        priority: 'shortest',
      },
    ]) {
      const response = await postRouteCost({
        routePreferences,
        alternatives: 1,
      });
      const body = response.json();

      expect(response.statusCode).toBe(200);
      expect(() => estimateRouteCostResponseSchema.parse(body)).not.toThrow();
    }
  });

  it.each([
    ['invalid priority', { routePreferences: { priority: 'eco' } }],
    ['non-boolean avoidance', { routePreferences: { avoidTolls: 'yes' } }],
    ['unknown preference field', { routePreferences: { avoidTunnels: true } }],
    ['null preference object', { routePreferences: null }],
    ['provider field leaked', { routePreferences: { use_tolls: 0 } }],
  ])('returns 400 for %s', async (_name, patch) => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await postRouteCost(patch);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: 'INVALID_ROUTE_COST_REQUEST',
    });
  });

  it('propagates every preference to the routing provider', async () => {
    useMockEnvironment();
    const received: RoutingRequest[] = [];
    app = await createTestApp(spyProvider(received));

    const response = await postRouteCost({
      routePreferences: {
        avoidTolls: true,
        avoidMotorways: true,
        avoidFerries: true,
        priority: 'shortest',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      vehicleCategory: 'maxi-scooter',
      preferences: {
        avoidTolls: true,
        avoidMotorways: true,
        avoidFerries: true,
        priority: 'shortest',
      },
    });
  });

  it('propagates each individual preference to the routing provider', async () => {
    useMockEnvironment();

    for (const routePreferences of [
      { avoidTolls: true },
      { avoidMotorways: true },
      { avoidFerries: true },
      { priority: 'shortest' },
    ]) {
      const received: RoutingRequest[] = [];
      app = await createTestApp(spyProvider(received));
      const response = await postRouteCost({ routePreferences });

      expect(response.statusCode).toBe(200);
      expect(received[0]?.preferences).toMatchObject(routePreferences);
      await app?.close();
      app = undefined;
    }
  });
});

function useMockEnvironment(): void {
  vi.stubEnv('ROUTING_PROVIDER', 'mock');
  vi.stubEnv('SWAGGER_ENABLED', 'false');
}

function spyProvider(received: RoutingRequest[]): RoutingProvider {
  return {
    async calculateRoutes(request: RoutingRequest) {
      received.push(request);

      return {
        alternatives: [
          {
            id: 'primary',
            distanceMetres: 10_000,
            durationSeconds: 600,
            encodedPolyline: 'encoded',
            segments: [
              {
                distanceMetres: 10_000,
                beginShapeIndex: 0,
                endShapeIndex: 20,
                roadCategory: 'motorway',
                classificationReason: 'road-class-motorway',
                isToll: true,
                isFerry: false,
              },
            ],
          } satisfies RouteAlternative,
        ],
      };
    },
  };
}

async function createTestApp(
  routingProvider?: RoutingProvider,
): Promise<NestFastifyApplication> {
  vi.resetModules();
  const provider = routingProvider ?? new MockRoutingProvider();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ROUTING_PROVIDER)
    .useValue(provider)
    .compile();

  const nestApp = moduleRef.createNestApplication(
    new FastifyAdapter({ bodyLimit: 1_048_576 }),
    { logger: false, bufferLogs: true },
  );
  nestApp.setGlobalPrefix('api');
  nestApp.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  await nestApp.init();
  const instance = await nestApp.getHttpAdapter().getInstance();
  await instance.ready();

  return nestApp as NestFastifyApplication;
}

async function postRouteCost(patch: Record<string, unknown> = {}) {
  if (!app) {
    throw new Error('App not initialized.');
  }

  const payload: EstimateRouteCostRequest = {
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
