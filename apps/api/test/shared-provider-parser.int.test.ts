import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createValhallaRoutingProvider } from '@route-cost/routing';
import { afterEach, expect, it, vi } from 'vitest';

import routePrimaryFixture from './fixtures/valhalla/route-primary.json';
import traceMixedRouteFixture from './fixtures/valhalla/trace-mixed-route.json';

let app: NestFastifyApplication | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('shares normalized Valhalla alternatives and segments between API and package consumers', async () => {
  vi.stubEnv('ROUTING_PROVIDER', 'valhalla');
  vi.stubEnv('VALHALLA_API_KEY', 'test-valhalla-key');
  vi.stubEnv('SWAGGER_ENABLED', 'false');
  const fetchImpl: typeof fetch = async (input) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    if (url.includes('/trace_attributes/'))
      return Response.json(traceMixedRouteFixture);
    if (url.includes('/route/')) return Response.json(routePrimaryFixture);
    throw new Error(`Unexpected URL: ${url}`);
  };
  vi.stubGlobal('fetch', fetchImpl);
  vi.resetModules();
  const { createApp } = await import('../src/create-app.js');
  const testApp = await createApp();
  app = testApp;

  const request = {
    origin: { latitude: 41.3902, longitude: 2.154 },
    destination: { latitude: 41.5912, longitude: 1.5209 },
    vehicleCategory: 'maxi-scooter' as const,
    alternatives: 0,
  };
  const response = await testApp.inject({
    method: 'POST',
    url: '/api/v1/routes',
    payload: request,
  });
  expect(response.statusCode).toBe(200);

  const result = await createValhallaRoutingProvider({
    baseUrl: 'https://api-eu.stadiamaps.com',
    routePath: '/route/v1',
    traceAttributesPath: '/trace_attributes/v1',
    apiKey: 'test-valhalla-key',
    clientId: 'route-cost',
    requestTimeoutMs: 8_000,
    maxAlternatives: 2,
    fetchImpl,
  }).calculateRoutes(request);
  const apiAlternatives = response.json().alternatives;
  expect(apiAlternatives).toHaveLength(result.alternatives.length);
  for (const [index, alternative] of result.alternatives.entries()) {
    expect(apiAlternatives[index]).toMatchObject({
      id: alternative.id,
      distanceMetres: alternative.distanceMetres,
      durationSeconds: alternative.durationSeconds,
      segments: alternative.segments.map((segment) => ({
        distanceMetres: segment.distanceMetres,
        roadCategory: segment.roadCategory,
        classificationReason: segment.classificationReason,
        isToll: segment.isToll,
        isFerry: segment.isFerry,
      })),
    });
    expect(apiAlternatives[index].segments).toEqual(alternative.segments);
  }
});
