import { expect, it } from 'vitest';

import { parseConfig } from '../src/config.js';
import { connect } from './client.js';

const ministryPayload = {
  Fecha: '20/11/2026 12:00:00',
  ListaEESSPrecio: [
    {
      IDEESS: '1',
      Latitud: '41,387',
      'Longitud (WGS84)': '2,170',
      'Precio Gasolina 95 E5': '1,50',
    },
    {
      IDEESS: '2',
      Latitud: '41,388',
      'Longitud (WGS84)': '2,171',
      'Precio Gasolina 95 E5': '1,70',
    },
    {
      IDEESS: '3',
      Latitud: '41,389',
      'Longitud (WGS84)': '2,172',
      'Precio Gasolina 95 E5': '999',
    },
  ],
};

it('returns a median from the injected Spanish data source', async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls++;
    return Response.json(ministryPayload);
  };
  const client = await connect({}, fetchImpl);
  const result = await client.callTool({
    name: 'suggest_fuel_price',
    arguments: { latitude: 41.387, longitude: 2.17 },
  });
  expect(result.isError).not.toBe(true);
  expect(result.structuredContent).toMatchObject({
    pricePerLitre: 1.6,
    sourceUrl: parseConfig({}).SPAIN_FUEL_PRICE_SOURCE_URL,
    sourceUpdatedAt: '2026-11-20T11:00:00.000Z',
    stationCount: 2,
  });
  expect(calls).toBe(1);
});

it('suggests a fuel price without routing or geocoding keys', async () => {
  const client = await connect(
    { ROUTING_PROVIDER: 'mock', GEOCODING_PROVIDER: 'mock' },
    () => Promise.resolve(Response.json(ministryPayload)),
  );
  const result = await client.callTool({
    name: 'suggest_fuel_price',
    arguments: { latitude: 41.387, longitude: 2.17 },
  });
  expect(result.isError).not.toBe(true);
  expect(result.structuredContent).toMatchObject({ pricePerLitre: 1.6 });
});

it('rejects mock fuel mode before any fetch', async () => {
  const client = await connect({ FUEL_PRICE_PROVIDER_MODE: 'mock' });
  const result = await client.callTool({
    name: 'suggest_fuel_price',
    arguments: { latitude: 41.387, longitude: 2.17 },
  });
  expect(result.isError).toBe(true);
  expect(JSON.stringify(result.content)).toContain('FUEL_PRICE_PROVIDER_MODE');
});

it('rejects stations without the requested usable fuel price', async () => {
  const fetchImpl: typeof fetch = async () =>
    Response.json({
      ListaEESSPrecio: [
        {
          IDEESS: '1',
          Latitud: '41,387',
          'Longitud (WGS84)': '2,170',
          'Precio Gasolina 95 E5': '0',
        },
        {
          IDEESS: '2',
          Latitud: '999',
          'Longitud (WGS84)': '2,170',
          'Precio Gasoleo A': '1,6',
        },
        {
          IDEESS: '3',
          Latitud: '41,387',
          'Longitud (WGS84)': '2,170',
          'Precio Gasoleo A': '1,6',
        },
      ],
    });
  const client = await connect({}, fetchImpl);
  const result = await client.callTool({
    name: 'suggest_fuel_price',
    arguments: { latitude: 41.387, longitude: 2.17 },
  });
  expect(result.isError).toBe(true);
  expect(JSON.stringify(result.content)).toContain('No station within 25 km');
});
