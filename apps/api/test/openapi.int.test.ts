import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

let app: NestFastifyApplication | undefined;

beforeAll(async () => {
  vi.stubEnv('SWAGGER_ENABLED', 'true');
  vi.stubEnv('ROUTING_PROVIDER', 'mock');
  vi.stubEnv('THROTTLING_ENABLED', 'false');
  vi.resetModules();
  const { createApp } = await import('../src/create-app.js');
  app = await createApp();
});

afterAll(async () => {
  try {
    await app?.close();
  } finally {
    vi.unstubAllEnvs();
  }
});

describe('OpenAPI document', () => {
  it('publishes named contract schemas and resolving references', async () => {
    if (!app) throw new Error('App not initialized.');
    const response = await app.inject('/docs-json');
    expect(response.statusCode).toBe(200);
    const document: unknown = response.json();
    if (
      !isRecord(document) ||
      !isRecord(document.components) ||
      !isRecord(document.components.schemas) ||
      !isRecord(document.paths)
    ) {
      throw new Error('Malformed OpenAPI document.');
    }
    const schemas = document.components.schemas;
    expect(Object.keys(schemas).length).toBeGreaterThanOrEqual(12);
    const expected = {
      '/api/v1/locations/autocomplete': [
        'get',
        'AutocompleteLocationsResponse',
      ],
      '/api/v1/locations/search': ['get', 'SearchLocationsResponse'],
      '/api/v1/locations/details': ['get', 'LocationDetailsResponse'],
      '/api/v1/locations/reverse': ['get', 'ReverseGeocodeResponse'],
      '/api/v1/routes': ['post', 'EstimateRouteResponse'],
      '/api/v1/route-cost-estimates': ['post', 'EstimateRouteCostResponse'],
      '/api/v1/fuel-price-suggestions': ['post', 'FuelPriceSuggestionResponse'],
      '/api/v1/health/live': ['get', 'HealthStatus'],
      '/api/v1/health/ready': ['get', 'HealthStatus'],
      '/api/v1/vehicles': ['get', 'VehicleListResponse'],
      '/api/v1/vehicles/{vehicleId}': ['get', 'VehicleDetailResponse'],
    };
    for (const [path, [method, name]] of Object.entries(expected)) {
      if (!method || !name) throw new Error('Missing operation definition.');
      const operation = document.paths[path];
      expect(isRecord(operation) && isRecord(operation[method])).toBe(true);
      if (!isRecord(operation) || !isRecord(operation[method])) continue;
      const responses = operation[method].responses;
      expect(isRecord(responses)).toBe(true);
      if (!isRecord(responses)) continue;
      expect(getResponseRef(responses['200'])).toBe(
        `#/components/schemas/${name}`,
      );
      for (const [status, item] of Object.entries(responses)) {
        if (!isRecord(item) || !('content' in item)) continue;
        expect(getResponseRef(item), `${path} ${method} ${status}`).toMatch(
          /^#\/components\/schemas\//,
        );
      }
    }
    for (const [path, name] of Object.entries({
      '/api/v1/routes': 'EstimateRouteRequest',
      '/api/v1/route-cost-estimates': 'EstimateRouteCostRequest',
      '/api/v1/fuel-price-suggestions': 'FuelPriceSuggestionRequest',
    })) {
      const route = document.paths[path];
      if (!isRecord(route) || !isRecord(route.post))
        throw new Error(`Missing ${path}`);
      const body = route.post.requestBody;
      if (!isRecord(body) || !isRecord(body.content))
        throw new Error(`Missing body on ${path}`);
      const json = body.content['application/json'];
      expect(isRecord(json) && isRecord(json.schema) && json.schema.$ref).toBe(
        `#/components/schemas/${name}`,
      );
      expect(
        isRecord(json) &&
          isRecord(json.examples) &&
          Object.keys(json.examples).length,
      ).toBeGreaterThan(0);
    }
    const serialized = JSON.stringify(document);
    expect(serialized).not.toContain('"$defs"');
    expect(serialized).not.toContain('#/$defs');
    for (const match of serialized.matchAll(
      /#\/components\/schemas\/([^"\\]+)/g,
    )) {
      expect(schemas[match[1] ?? '']).toBeDefined();
    }
  });
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getResponseRef(response: unknown): unknown {
  if (!isRecord(response) || !isRecord(response.content)) return undefined;
  const json = response.content['application/json'];
  if (!isRecord(json) || !isRecord(json.schema)) return undefined;
  return json.schema.$ref;
}
