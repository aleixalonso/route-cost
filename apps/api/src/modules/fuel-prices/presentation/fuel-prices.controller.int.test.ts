import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

let app: NestFastifyApplication | undefined;

describe('FuelPricesController HTTP', () => {
  afterEach(async () => {
    await app?.close();
    app = undefined;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('suggests a nearby median price for a supported country', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await suggestFuelPrice({
      coordinate: { latitude: 41.387, longitude: 2.17 },
      fuelProduct: 'petrol-95-e5',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'available',
      country: { code: 'ES', name: 'Spain' },
      fuelProduct: 'petrol-95-e5',
      suggestion: {
        method: 'nearby-median',
        suggestedPricePerLitre: { amount: 1.609, currency: 'EUR' },
        stationCount: 5,
        radiusMetres: 10_000,
        isStale: false,
      },
    });
  }, 10_000);

  it('resolves the fuel product from a petrol catalog vehicle', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await suggestFuelPrice({
      coordinate: { latitude: 41.387, longitude: 2.17 },
      vehicleId: 'honda-forza-350-2025',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'available',
      fuelProduct: 'petrol-95-e5',
      suggestion: { stationCount: 5, radiusMetres: 10_000 },
    });
  }, 10_000);

  it('suggests the diesel product for a diesel catalog vehicle', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await suggestFuelPrice({
      coordinate: { latitude: 41.387, longitude: 2.17 },
      vehicleId: 'volkswagen-golf-2-0-tdi-2025',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'available',
      fuelProduct: 'diesel-a',
      suggestion: {
        suggestedPricePerLitre: { amount: 1.519, currency: 'EUR' },
        stationCount: 5,
        radiusMetres: 10_000,
      },
    });
  }, 10_000);

  it('reports an unsupported country without a registered provider', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await suggestFuelPrice({
      coordinate: { latitude: 48.8566, longitude: 2.3522 },
      fuelProduct: 'petrol-95-e5',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'unsupported-country',
      country: { code: 'FR', name: 'France' },
      fuelProduct: 'petrol-95-e5',
    });
  }, 10_000);

  it('reports an undetermined country when resolution fails', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await suggestFuelPrice({
      coordinate: { latitude: 0.01, longitude: 0.01 },
      fuelProduct: 'petrol-95-e5',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'country-undetermined',
      fuelProduct: 'petrol-95-e5',
    });
  }, 10_000);

  it('reports no nearby prices when no stations are within reach', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await suggestFuelPrice({
      coordinate: { latitude: 44, longitude: 2 },
      fuelProduct: 'petrol-95-e5',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'no-nearby-prices',
      country: { code: 'ES', name: 'Spain' },
      fuelProduct: 'petrol-95-e5',
      maximumRadiusMetres: 25_000,
    });
  }, 10_000);

  it('rejects requests with both vehicle and fuel product selections', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await suggestFuelPrice({
      coordinate: { latitude: 41.387, longitude: 2.17 },
      vehicleId: 'honda-forza-350-2025',
      fuelProduct: 'petrol-95-e5',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: 'INVALID_FUEL_PRICE_SUGGESTION_REQUEST',
      message: 'Validation failed',
    });
  }, 10_000);

  it('rejects requests without a vehicle or fuel product selection', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await suggestFuelPrice({
      coordinate: { latitude: 41.387, longitude: 2.17 },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: 'INVALID_FUEL_PRICE_SUGGESTION_REQUEST',
    });
  }, 10_000);

  it('returns 404 for an unknown catalog vehicle', async () => {
    useMockEnvironment();
    app = await createTestApp();

    const response = await suggestFuelPrice({
      coordinate: { latitude: 41.387, longitude: 2.17 },
      vehicleId: 'unknown-vehicle',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      code: 'VEHICLE_NOT_FOUND',
    });
  }, 10_000);
});

function useMockEnvironment(): void {
  vi.stubEnv('ROUTING_PROVIDER', 'mock');
  vi.stubEnv('SWAGGER_ENABLED', 'false');
}

async function createTestApp(): Promise<NestFastifyApplication> {
  vi.resetModules();
  const appModule = await import('../../../create-app.js');
  return appModule.createApp();
}

async function suggestFuelPrice(
  payload: Record<string, unknown>,
): Promise<import('fastify').LightMyRequestResponse> {
  if (!app) {
    throw new Error('App not initialized.');
  }

  return app.inject({
    method: 'POST',
    url: '/api/v1/fuel-price-suggestions',
    payload,
  });
}
