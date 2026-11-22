import {
  classifyRouteSegment,
  type RouteSegment,
  type RoutingProfile,
} from '@route-cost/routing';
import { z } from 'zod';

import type { McpConfig } from '../config.js';
import { UpstreamError } from '../errors.js';
import { fetchJson } from './http.js';

const routeSchema = z.object({
  trip: z.object({
    summary: z.object({ length: z.number().finite().nonnegative() }),
    legs: z.array(z.object({ shape: z.string().min(1) })).min(1),
  }),
});
const edgeSchema = z.object({
  length: z.number().finite().nonnegative(),
  speed: z.number().nullable().optional(),
  speed_limit: z.number().nullable().optional(),
  road_class: z.string().nullable().optional(),
  use: z.string().nullable().optional(),
  toll: z.boolean().nullable().optional(),
  unpaved: z.boolean().nullable().optional(),
  surface: z.string().nullable().optional(),
  density: z.number().finite().nullable().optional(),
  weighted_grade: z.number().nullable().optional(),
  max_upward_grade: z.number().nullable().optional(),
  max_downward_grade: z.number().nullable().optional(),
  mean_elevation: z.number().nullable().optional(),
  begin_shape_index: z.number().int().nonnegative(),
  end_shape_index: z.number().int().nonnegative(),
});
const traceSchema = z.object({ edges: z.array(edgeSchema) });
const attributes = [
  'edge.length',
  'edge.speed',
  'edge.speed_limit',
  'edge.road_class',
  'edge.use',
  'edge.toll',
  'edge.unpaved',
  'edge.surface',
  'edge.density',
  'edge.weighted_grade',
  'edge.max_upward_grade',
  'edge.max_downward_grade',
  'edge.mean_elevation',
  'edge.begin_shape_index',
  'edge.end_shape_index',
];

export async function route(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  costing: RoutingProfile,
  config: McpConfig,
  fetchImpl: typeof fetch,
) {
  const headers = {
    Authorization: `Stadia-Auth ${config.VALHALLA_API_KEY}`,
    'X-Client-Id': 'route-cost',
    'Content-Type': 'application/json',
  };
  const trip = await fetchJson(
    fetchImpl,
    'Valhalla routing',
    new URL(config.VALHALLA_ROUTE_PATH, config.VALHALLA_BASE_URL).toString(),
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        locations: [
          { lat: origin.latitude, lon: origin.longitude },
          { lat: destination.latitude, lon: destination.longitude },
        ],
        costing,
        units: 'kilometers',
        directions_type: 'none',
      }),
    },
    8000,
    routeSchema,
  );
  const shape = trip.trip.legs[0]?.shape;
  if (shape === undefined) throw new UpstreamError('Valhalla routing');
  const trace = await fetchJson(
    fetchImpl,
    'Valhalla trace attributes',
    new URL(
      config.VALHALLA_TRACE_ATTRIBUTES_PATH,
      config.VALHALLA_BASE_URL,
    ).toString(),
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        encoded_polyline: shape,
        costing,
        shape_match: 'edge_walk',
        filters: { action: 'include', attributes },
      }),
    },
    8000,
    traceSchema,
  );
  if (trace.edges.length === 0)
    throw new Error(
      'Valhalla trace returned no edges; route cost cannot be estimated.',
    );
  const segments: RouteSegment[] = trace.edges.map((edge) => {
    const classification = classifyRouteSegment({
      ...(edge.road_class == null ? {} : { roadClass: edge.road_class }),
      ...(edge.density == null ? {} : { density: edge.density }),
    });
    return {
      distanceMetres: edge.length * 1000,
      beginShapeIndex: edge.begin_shape_index,
      endShapeIndex: edge.end_shape_index,
      ...classification,
      isToll: edge.toll ?? null,
      isFerry:
        edge.use == null
          ? null
          : edge.use === 'ferry' || edge.use === 'rail-ferry',
    };
  });
  const distanceMetres = segments.reduce(
    (sum, segment) => sum + segment.distanceMetres,
    0,
  );
  if (
    distanceMetres <= 0 ||
    Math.abs(distanceMetres - trip.trip.summary.length * 1000) >
      Math.max(250, trip.trip.summary.length * 50)
  )
    throw new Error('Valhalla route and trace distances do not match.');
  return {
    segments,
    distanceKm: distanceMetres / 1000,
    hasToll: segments.some((segment) => segment.isToll === true),
    hasFerry: segments.some((segment) => segment.isFerry === true),
  };
}
