import { describe, expect, it } from 'vitest';

import { toValhallaConfig } from './valhalla.types';

describe('toValhallaConfig', () => {
  it('maps the valhalla environment subset', () => {
    expect(
      toValhallaConfig({
        VALHALLA_BASE_URL: 'https://example.com',
        VALHALLA_ROUTE_PATH: '/route/v1',
        VALHALLA_TRACE_ATTRIBUTES_PATH: '/trace_attributes/v1',
        VALHALLA_API_KEY: 'test-key',
        VALHALLA_CLIENT_ID: 'test-client',
        VALHALLA_REQUEST_TIMEOUT_MS: 8_000,
        VALHALLA_MAX_ALTERNATIVES: 1,
      }),
    ).toEqual({
      baseUrl: 'https://example.com',
      routePath: '/route/v1',
      traceAttributesPath: '/trace_attributes/v1',
      apiKey: 'test-key',
      clientId: 'test-client',
      requestTimeoutMs: 8_000,
      maxAlternatives: 1,
    });
  });
});
