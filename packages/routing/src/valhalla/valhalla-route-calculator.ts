import type { ZodSchema } from 'zod';

import type { RoutingRequest, RoutingResult } from '../index.js';
import {
  normalizeRoutePreferences,
  resolveRoutingProfile,
} from '../route-preferences.js';
import type { ValhallaConfig } from './valhalla-config.js';
import { buildValhallaCostingOptions } from './valhalla-costing-options.js';
import {
  getValhallaRouteShapes,
  normalizeValhallaRoutes,
} from './valhalla-normalizer.js';
import {
  buildValhallaRouteRequest,
  buildValhallaTraceAttributesRequest,
} from './valhalla-request.builder.js';
import { valhallaRouteResponseSchema } from './valhalla-route.schema.js';
import { valhallaTraceAttributesResponseSchema } from './valhalla-trace-attributes.schema.js';

export interface ValhallaHttpPort {
  post<T>(
    path: string,
    body: unknown,
    responseSchema: ZodSchema<T>,
  ): Promise<T>;
}

export async function calculateValhallaRoutes(
  request: RoutingRequest,
  config: ValhallaConfig,
  httpClient: ValhallaHttpPort,
): Promise<RoutingResult> {
  const profile = resolveRoutingProfile(request.vehicleCategory);
  const preferences = normalizeRoutePreferences(request.preferences);
  const costingOptions = buildValhallaCostingOptions(profile, preferences);
  const routeResponse = await httpClient.post(
    config.routePath,
    buildValhallaRouteRequest(request, profile, config, costingOptions),
    valhallaRouteResponseSchema,
  );
  const traceResponses = await Promise.all(
    getValhallaRouteShapes(routeResponse).map((shape) =>
      httpClient.post(
        config.traceAttributesPath,
        buildValhallaTraceAttributesRequest(shape, profile, costingOptions),
        valhallaTraceAttributesResponseSchema,
      ),
    ),
  );

  return normalizeValhallaRoutes(routeResponse, traceResponses);
}
