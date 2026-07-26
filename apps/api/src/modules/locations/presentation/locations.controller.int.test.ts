import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../create-app';

describe('LocationsController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns autocomplete suggestions without coordinates', async () => {
    const response = await app.inject(
      '/api/v1/locations/autocomplete?query=Pla%C3%A7a&countryCode=es&language=ca',
    );

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      attribution: { url: 'https://stadiamaps.com/attribution/' },
      items: [
        {
          id: 'mock:placa-catalunya',
          primaryText: 'Plaça de Catalunya',
          type: 'point-of-interest',
          precision: 'point',
        },
      ],
    });
    expect(response.json().items[0]).not.toHaveProperty('coordinate');
  });

  it('validates autocomplete query and focus pairs', async () => {
    expect(
      (await app.inject('/api/v1/locations/autocomplete?query=Pl')).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject(
          '/api/v1/locations/autocomplete?query=Pla%C3%A7a&focusLatitude=41.3',
        )
      ).statusCode,
    ).toBe(400);
  });

  it('returns search locations with coordinates and empty results', async () => {
    const response = await app.inject(
      '/api/v1/locations/search?query=Barcelona&limit=2',
    );

    expect(response.statusCode).toBe(200);
    expect(response.json().items[0]).toMatchObject({
      coordinate: { latitude: 41.387, longitude: 2.17 },
      countryCode: 'ES',
      locality: 'Barcelona',
    });

    const empty = await app.inject('/api/v1/locations/search?query=empty');
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toEqual({
      items: [],
      attribution: { url: 'https://stadiamaps.com/attribution/' },
    });

    expect(
      (await app.inject('/api/v1/locations/search?query=Barcelona&limit=11'))
        .statusCode,
    ).toBe(400);
  });

  it('returns place details or LOCATION_NOT_FOUND', async () => {
    const response = await app.inject(
      '/api/v1/locations/details?placeId=mock%3Asagrada-familia&language=ca',
    );

    expect(response.statusCode).toBe(200);
    expect(response.json().location.coordinate).toEqual({
      latitude: 41.4036,
      longitude: 2.1744,
    });

    const encoded = await app.inject(
      '/api/v1/locations/details?placeId=mock%3Aplaca-catalunya',
    );
    expect(encoded.statusCode).toBe(200);

    const missing = await app.inject(
      '/api/v1/locations/details?placeId=mock%3Amissing',
    );
    expect(missing.statusCode).toBe(404);
    expect(missing.json().code).toBe('LOCATION_NOT_FOUND');
  });

  it('returns reverse results in order and validates coordinates', async () => {
    const response = await app.inject(
      '/api/v1/locations/reverse?latitude=41.387&longitude=2.170&limit=2',
    );

    expect(response.statusCode).toBe(200);
    expect(
      response.json().items.map((item: { id: string }) => item.id),
    ).toEqual(['mock:placa-catalunya', 'mock:sagrada-familia']);

    expect(
      (await app.inject('/api/v1/locations/reverse?latitude=91&longitude=2'))
        .statusCode,
    ).toBe(400);
    expect(
      (await app.inject('/api/v1/locations/reverse?latitude=41&longitude=181'))
        .statusCode,
    ).toBe(400);

    const empty = await app.inject(
      '/api/v1/locations/reverse?latitude=0&longitude=0',
    );
    expect(empty.statusCode).toBe(200);
    expect(empty.json().items).toEqual([]);
  });
});
