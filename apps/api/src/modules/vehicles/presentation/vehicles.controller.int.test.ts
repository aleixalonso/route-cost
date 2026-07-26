import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

let app: NestFastifyApplication | undefined;

describe('VehiclesController HTTP', () => {
  afterEach(async () => {
    await app?.close();
    app = undefined;
    vi.unstubAllEnvs();
  });

  it('lists six vehicles in deterministic order', async () => {
    app = await createTestApp();

    const response = await app.inject('/api/v1/vehicles');
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.total).toBe(6);
    expect(body.items.map((vehicle: { id: string }) => vehicle.id)).toEqual([
      'honda-forza-350-2025',
      'honda-nx500-2025',
      'toyota-corolla-1-8-hybrid-2025',
      'volkswagen-golf-1-5-tsi-2025',
      'volkswagen-golf-2-0-tdi-2025',
      'yamaha-xmax-300-2025',
    ]);
  });

  it.each([
    ['/api/v1/vehicles?vehicleCategory=car', 3],
    ['/api/v1/vehicles?vehicleCategory=maxi-scooter', 2],
    ['/api/v1/vehicles?fuelType=petrol', 5],
    ['/api/v1/vehicles?fuelType=diesel', 1],
    ['/api/v1/vehicles?powertrainType=full-hybrid', 1],
    ['/api/v1/vehicles?search=Honda', 2],
    ['/api/v1/vehicles?search=Golf', 2],
    ['/api/v1/vehicles?vehicleCategory=maxi-scooter&search=honda', 1],
    ['/api/v1/vehicles?search=missing', 0],
  ])('filters %s', async (url, expectedTotal) => {
    app = await createTestApp();

    const response = await app.inject(url);

    expect(response.statusCode).toBe(200);
    expect(response.json().total).toBe(expectedTotal);
  });

  it('returns vehicle detail with full consumption metadata and sources', async () => {
    app = await createTestApp();

    const response = await app.inject('/api/v1/vehicles/honda-forza-350-2025');
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      id: 'honda-forza-350-2025',
      displayName: 'Honda Forza 350',
      consumptionData: {
        status: 'estimated',
        confidence: 'medium',
      },
    });
    expect(body.consumptionData.methodology).toContain('Honda publishes');
    expect(body.consumptionData.sources).toHaveLength(1);
  });

  it('returns 404 for unknown vehicles', async () => {
    app = await createTestApp();

    const response = await app.inject('/api/v1/vehicles/missing');

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      statusCode: 404,
      code: 'VEHICLE_NOT_FOUND',
      message: 'The requested vehicle was not found.',
    });
  });
});

async function createTestApp(): Promise<NestFastifyApplication> {
  vi.stubEnv('ROUTING_PROVIDER', 'mock');
  vi.stubEnv('SWAGGER_ENABLED', 'false');
  vi.resetModules();
  const appModule = await import('../../../create-app.js');
  return appModule.createApp();
}
