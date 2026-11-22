import { expect, it } from 'vitest';

import { parseConfig } from '../src/config.js';
import { connect } from './client.js';

it.each([
  {},
  {
    ROUTING_PROVIDER: 'valhalla',
    VALHALLA_API_KEY: 'test',
    GEOCODING_PROVIDER: 'stadia',
  },
])('refuses missing live credentials without estimate data', async (env) => {
  const client = await connect(env);
  const result = await client.callTool({
    name: 'estimate_route_cost',
    arguments: {
      origin: 'A',
      destination: 'B',
      vehicleId: 'honda-forza-350-2025',
    },
  });
  expect(result.isError).toBe(true);
  expect(result.structuredContent).toBeUndefined();
  const text = JSON.stringify(result.content);
  expect(text).toContain('VALHALLA_API_KEY');
  expect(text).toContain('STADIA_API_KEY');
  expect(text).not.toMatch(/distanceKm|litres|estimatedCost/);
});

it('estimates from real-style trace edges and official median data', async () => {
  const urls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    urls.push(url);
    if (url.includes('geocoding'))
      return Response.json({
        features: [
          {
            properties: {
              gid: 'x',
              name: urls.length === 1 ? 'Origin' : 'Destination',
            },
            geometry: { type: 'Point', coordinates: [2.17, 41.387] },
          },
        ],
      });
    if (url.includes('trace_attributes'))
      return Response.json({
        edges: [
          {
            length: 1,
            road_class: 'residential',
            begin_shape_index: 0,
            end_shape_index: 1,
          },
          {
            length: 2,
            road_class: 'primary',
            begin_shape_index: 1,
            end_shape_index: 2,
          },
          {
            length: 3,
            road_class: 'motorway',
            begin_shape_index: 2,
            end_shape_index: 3,
          },
        ],
      });
    if (url.includes('route'))
      return Response.json({
        trip: { summary: { length: 6 }, legs: [{ shape: 'encoded' }] },
      });
    return Response.json({
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
      ],
    });
  };
  const client = await connect(
    {
      ROUTING_PROVIDER: 'valhalla',
      VALHALLA_API_KEY: 'test',
      GEOCODING_PROVIDER: 'stadia',
      STADIA_API_KEY: 'test',
    },
    fetchImpl,
  );
  const result = await client.callTool({
    name: 'estimate_route_cost',
    arguments: {
      origin: 'A',
      destination: 'B',
      vehicleId: 'volkswagen-golf-1-5-tsi-2025',
    },
  });
  expect(result.isError).not.toBe(true);
  expect(result.structuredContent).toMatchObject({
    distanceKm: 6,
    costPerLitre: 1.6,
    currency: 'EUR',
    litres: 0.347,
    estimatedCost: 0.5552,
    breakdownByRoadCategory: {
      urban: { distanceKm: 1 },
      interurban: { distanceKm: 2 },
      motorway: { distanceKm: 3 },
      unknown: { distanceKm: 0, litres: 0 },
    },
  });
  expect(JSON.stringify(result.structuredContent)).toContain(
    parseConfig({}).SPAIN_FUEL_PRICE_SOURCE_URL,
  );
  expect(JSON.stringify(result.structuredContent)).toContain(
    '2026-11-20T11:00:00.000Z',
  );
  expect(urls).toHaveLength(5);
});

it('uses a caller price without fetching Ministry data', async () => {
  const urls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    urls.push(url);
    if (url.includes('geocoding'))
      return Response.json({
        features: [
          {
            properties: { gid: 'x', name: 'Point' },
            geometry: { type: 'Point', coordinates: [2.17, 41.387] },
          },
        ],
      });
    if (url.includes('trace_attributes'))
      return Response.json({
        edges: [
          {
            length: 1,
            road_class: null,
            density: null,
            toll: true,
            use: 'ferry',
            begin_shape_index: 0,
            end_shape_index: 1,
          },
        ],
      });
    return Response.json({
      trip: { summary: { length: 1 }, legs: [{ shape: 'encoded' }] },
    });
  };
  const client = await connect(
    {
      ROUTING_PROVIDER: 'valhalla',
      VALHALLA_API_KEY: 'test',
      GEOCODING_PROVIDER: 'stadia',
      STADIA_API_KEY: 'test',
    },
    fetchImpl,
  );
  const result = await client.callTool({
    name: 'estimate_route_cost',
    arguments: {
      origin: 'A',
      destination: 'B',
      vehicleId: 'volkswagen-golf-1-5-tsi-2025',
      fuelPrice: { amountPerLitre: 2 },
    },
  });
  expect(result.isError).not.toBe(true);
  expect(result.structuredContent).toMatchObject({
    costPerLitre: 2,
    currency: 'EUR',
    breakdownByRoadCategory: { unknown: { distanceKm: 1 } },
  });
  expect(JSON.stringify(result.structuredContent)).toContain(
    'Caller-supplied fuel price',
  );
  expect(urls).toHaveLength(4);
});

it('rejects an empty trace and never returns a zero-cost estimate', async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    if (url.includes('geocoding'))
      return Response.json({
        features: [
          {
            properties: { gid: 'x', name: 'Point' },
            geometry: { type: 'Point', coordinates: [2.17, 41.387] },
          },
        ],
      });
    if (url.includes('trace_attributes')) return Response.json({ edges: [] });
    return Response.json({
      trip: { summary: { length: 1 }, legs: [{ shape: 'encoded' }] },
    });
  };
  const client = await connect(
    {
      ROUTING_PROVIDER: 'valhalla',
      VALHALLA_API_KEY: 'test',
      GEOCODING_PROVIDER: 'stadia',
      STADIA_API_KEY: 'test',
    },
    fetchImpl,
  );
  const result = await client.callTool({
    name: 'estimate_route_cost',
    arguments: {
      origin: 'A',
      destination: 'B',
      vehicleId: 'volkswagen-golf-1-5-tsi-2025',
      fuelPrice: { amountPerLitre: 2 },
    },
  });
  expect(result.isError).toBe(true);
  expect(result.structuredContent).toBeUndefined();
  expect(JSON.stringify(result.content)).toContain('no edges');
});
