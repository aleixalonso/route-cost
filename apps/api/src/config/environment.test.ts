import { describe, expect, it } from 'vitest';

import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it('provides safe local defaults', () => {
    expect(validateEnvironment({})).toMatchObject({
      NODE_ENV: 'development',
      HOST: '0.0.0.0',
      PORT: 3001,
      ROUTING_PROVIDER: 'mock',
      VALHALLA_BASE_URL: 'https://api-eu.stadiamaps.com',
      VALHALLA_ROUTE_PATH: '/route/v1',
      VALHALLA_TRACE_ATTRIBUTES_PATH: '/trace_attributes/v1',
      VALHALLA_REQUEST_TIMEOUT_MS: 8_000,
      VALHALLA_MAX_ALTERNATIVES: 2,
    });
  });

  it('rejects unsupported routing providers', () => {
    expect(() =>
      validateEnvironment({ ROUTING_PROVIDER: 'external' }),
    ).toThrow();
  });

  it('requires a Valhalla API key when Valhalla is selected', () => {
    expect(() =>
      validateEnvironment({ ROUTING_PROVIDER: 'valhalla' }),
    ).toThrow();
  });

  it('accepts Valhalla configuration when a key is supplied', () => {
    expect(
      validateEnvironment({
        ROUTING_PROVIDER: 'valhalla',
        VALHALLA_API_KEY: 'test-key',
        VALHALLA_MAX_ALTERNATIVES: '1',
      }),
    ).toMatchObject({
      ROUTING_PROVIDER: 'valhalla',
      VALHALLA_API_KEY: 'test-key',
      VALHALLA_MAX_ALTERNATIVES: 1,
    });
  });

  it('rejects invalid Valhalla URLs and paths', () => {
    expect(() =>
      validateEnvironment({ VALHALLA_BASE_URL: 'not-a-url' }),
    ).toThrow();
    expect(() =>
      validateEnvironment({ VALHALLA_ROUTE_PATH: 'route/v1' }),
    ).toThrow();
  });

  it('rejects invalid Valhalla limits', () => {
    expect(() =>
      validateEnvironment({ VALHALLA_REQUEST_TIMEOUT_MS: '0' }),
    ).toThrow();
    expect(() =>
      validateEnvironment({ VALHALLA_MAX_ALTERNATIVES: '3' }),
    ).toThrow();
  });
});
