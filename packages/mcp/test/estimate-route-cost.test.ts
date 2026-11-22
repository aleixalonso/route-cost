import { expect, it } from 'vitest';

import { parseConfig } from '../src/config.js';
import { connect } from './client.js';

async function refusalContent(env: Record<string, string>): Promise<string> {
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
  expect(text).not.toMatch(/distanceKm|litres|estimatedCost/);
  expect(text).not.toMatch(/[0-9]+(\.[0-9]+)?\s*(km|L)\b/);
  return text;
}

it('refuses when both live keys are missing', async () => {
  const text = await refusalContent({
    ROUTING_PROVIDER: 'valhalla',
    GEOCODING_PROVIDER: 'stadia',
  });
  expect(text).toContain('VALHALLA_API_KEY is missing or empty');
  expect(text).toContain('STADIA_GEOCODING_API_KEY is missing or empty');
  expect(text).not.toContain('instead of "valhalla"');
  expect(text).not.toContain('instead of "stadia"');
});

it('refuses when only the routing key is missing', async () => {
  const text = await refusalContent({
    ROUTING_PROVIDER: 'valhalla',
    GEOCODING_PROVIDER: 'stadia',
    STADIA_GEOCODING_API_KEY: 'test',
  });
  expect(text).toContain('VALHALLA_API_KEY is missing or empty');
  expect(text).not.toContain('STADIA_GEOCODING_API_KEY is missing or empty');
  expect(text).not.toContain('instead of');
});

it('refuses when only the geocoding key is missing', async () => {
  const text = await refusalContent({
    ROUTING_PROVIDER: 'valhalla',
    VALHALLA_API_KEY: 'test',
    GEOCODING_PROVIDER: 'stadia',
  });
  expect(text).toContain('STADIA_GEOCODING_API_KEY is missing or empty');
  expect(text).not.toContain('VALHALLA_API_KEY is missing or empty');
});

it('refuses when both providers are mock despite valid keys', async () => {
  const text = await refusalContent({
    VALHALLA_API_KEY: 'test',
    STADIA_GEOCODING_API_KEY: 'test',
  });
  expect(text).toContain(
    'ROUTING_PROVIDER is \\"mock\\" instead of \\"valhalla\\"',
  );
  expect(text).toContain(
    'GEOCODING_PROVIDER is \\"mock\\" instead of \\"stadia\\"',
  );
  expect(text).not.toContain('is missing or empty');
});

it.each([6, 6.004])(
  'estimates from trace edges and official median data with a route summary of %s km',
  async (summaryLength) => {
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
          type: 'FeatureCollection',
          geocoding: { attribution: 'https://stadiamaps.com' },
          features: [
            {
              type: 'Feature',
              properties: {
                gid: 'x',
                layer: 'locality',
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
          trip: {
            summary: { length: summaryLength, time: 600 },
            legs: [{ shape: 'encoded' }],
          },
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
  },
);

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
        type: 'FeatureCollection',
        geocoding: { attribution: 'https://stadiamaps.com' },
        features: [
          {
            type: 'Feature',
            properties: { gid: 'x', layer: 'locality', name: 'Point' },
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
      trip: { summary: { length: 1, time: 100 }, legs: [{ shape: 'encoded' }] },
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

it('explains trace_attributes entitlement failure without a partial estimate', async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    if (url.includes('geocoding'))
      return Response.json({
        type: 'FeatureCollection',
        geocoding: { attribution: 'https://stadiamaps.com' },
        features: [
          {
            type: 'Feature',
            properties: { gid: 'x', layer: 'locality', name: 'Point' },
            geometry: { type: 'Point', coordinates: [2.17, 41.387] },
          },
        ],
      });
    if (url.includes('trace_attributes'))
      return Response.json(
        {
          error:
            'Account does not have access to this endpoint. Please upgrade your account.',
        },
        { status: 403 },
      );
    return Response.json({
      trip: { summary: { length: 1, time: 100 }, legs: [{ shape: 'encoded' }] },
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
  const text = JSON.stringify(result.content);
  expect(text).toContain('trace_attributes');
  expect(text).toContain('Stadia Maps plan');
  expect(text).not.toContain('Valhalla authentication failed');
  expect(text).not.toContain('estimatedCost');
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
        type: 'FeatureCollection',
        geocoding: { attribution: 'https://stadiamaps.com' },
        features: [
          {
            type: 'Feature',
            properties: { gid: 'x', layer: 'locality', name: 'Point' },
            geometry: { type: 'Point', coordinates: [2.17, 41.387] },
          },
        ],
      });
    if (url.includes('trace_attributes')) return Response.json({ edges: [] });
    return Response.json({
      trip: { summary: { length: 1, time: 100 }, legs: [{ shape: 'encoded' }] },
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
  expect(JSON.stringify(result.content)).toContain(
    'Valhalla returned an invalid response',
  );
});
