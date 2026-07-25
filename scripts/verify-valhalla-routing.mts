import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  getValhallaRouteShapes,
  normalizeValhallaRoutes,
} from '../apps/api/src/modules/route-estimation/infrastructure/valhalla/valhalla-normalizer';
import {
  buildValhallaRouteRequest,
  buildValhallaTraceAttributesRequest,
} from '../apps/api/src/modules/route-estimation/infrastructure/valhalla/valhalla-request.builder';
import { valhallaRouteResponseSchema } from '../apps/api/src/modules/route-estimation/infrastructure/valhalla/valhalla-route.schema';
import { valhallaTraceAttributesResponseSchema } from '../apps/api/src/modules/route-estimation/infrastructure/valhalla/valhalla-trace-attributes.schema';
import type {
  ValhallaConfig,
  ValhallaRouteResponse,
  ValhallaTraceAttributesResponse,
} from '../apps/api/src/modules/route-estimation/infrastructure/valhalla/valhalla.types';
import {
  resolveRoutingProfile,
  summarizeRouteDistances,
  type RoutingRequest,
  type RoutingResult,
  type VehicleRoutingCategory,
} from '../packages/routing/src/index';
import type { ZodSchema } from 'zod';

const args = parseArgs(process.argv.slice(2));

async function main(): Promise<void> {
  const apiKey = process.env.VALHALLA_API_KEY;

  if (!apiKey) {
    throw new Error('VALHALLA_API_KEY is required.');
  }

  const config: ValhallaConfig = {
    baseUrl: process.env.VALHALLA_BASE_URL ?? 'https://api-eu.stadiamaps.com',
    routePath: process.env.VALHALLA_ROUTE_PATH ?? '/route/v1',
    traceAttributesPath:
      process.env.VALHALLA_TRACE_ATTRIBUTES_PATH ?? '/trace_attributes/v1',
    apiKey,
    clientId: process.env.VALHALLA_CLIENT_ID ?? 'route-cost',
    requestTimeoutMs: Number(process.env.VALHALLA_REQUEST_TIMEOUT_MS ?? 8_000),
    maxAlternatives: Number(process.env.VALHALLA_MAX_ALTERNATIVES ?? 2),
  };
  const result = await calculateRoutes(config, args.debug, {
    origin: args.origin ?? { latitude: 41.3902, longitude: 2.154 },
    destination: args.destination ?? { latitude: 41.5912, longitude: 1.5209 },
    vehicleCategory: args.vehicleCategory ?? 'maxi-scooter',
    alternatives: args.alternatives ?? 1,
  });

  for (const alternative of result.alternatives) {
    const summary = summarizeRouteDistances(alternative.segments);
    const missingSpeedLimits = alternative.segments.filter(
      (segment) => segment.speedLimitKmh === undefined,
    ).length;
    const missingDensityValues = alternative.segments.filter(
      (segment) => segment.density === undefined,
    ).length;
    const tollSegments = alternative.segments.filter(
      (segment) => segment.toll === true,
    ).length;

    console.log(`Alternative: ${alternative.id}`);
    console.log(`Total distance metres: ${alternative.distanceMetres}`);
    console.log(`Total duration seconds: ${alternative.durationSeconds}`);
    console.log(`Urban metres: ${summary.urbanDistanceMetres}`);
    console.log(`Interurban metres: ${summary.interurbanDistanceMetres}`);
    console.log(`Motorway metres: ${summary.motorwayDistanceMetres}`);
    console.log(`Unknown metres: ${summary.unknownDistanceMetres}`);
    console.log(`Segment count: ${alternative.segments.length}`);
    console.log(`Missing speed limits: ${missingSpeedLimits}`);
    console.log(`Missing density values: ${missingDensityValues}`);
    console.log(`Toll segments: ${tollSegments}`);
  }
}

async function calculateRoutes(
  config: ValhallaConfig,
  debug: boolean,
  request: RoutingRequest,
): Promise<RoutingResult> {
  const profile = resolveRoutingProfile(request.vehicleCategory);
  const routeResponse = await postValhalla(
    config,
    debug,
    config.routePath,
    buildValhallaRouteRequest(request, profile, config),
    valhallaRouteResponseSchema,
  );
  const traceResponses = await Promise.all(
    getValhallaRouteShapes(routeResponse).map((shape) =>
      postValhalla(
        config,
        debug,
        config.traceAttributesPath,
        buildValhallaTraceAttributesRequest(shape, profile),
        valhallaTraceAttributesResponseSchema,
      ),
    ),
  );

  return normalizeValhallaRoutes(routeResponse, traceResponses);
}

async function postValhalla<T>(
  config: ValhallaConfig,
  debug: boolean,
  path: string,
  body: unknown,
  responseSchema: ZodSchema<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const response = await fetch(new URL(path, config.baseUrl), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Stadia-Auth ${config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Client-Id': config.clientId,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = await readJson(response);

    if (debug) {
      await writeDebugResponse(path, json);
    }

    if (!response.ok) {
      throw new Error(
        `Valhalla request failed with status ${response.status}.`,
      );
    }

    return responseSchema.parse(json);
  } finally {
    clearTimeout(timeout);
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error('Valhalla returned malformed JSON.');
  }
}

async function writeDebugResponse(
  path: string,
  response: unknown,
): Promise<void> {
  const outputDirectory = join(
    process.cwd(),
    '.valhalla-debug',
    String(Date.now()),
  );
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    join(outputDirectory, sanitizeFilename(path)),
    JSON.stringify(response, null, 2),
  );
  console.log(`Debug response saved in ${outputDirectory}`);
}

function parseArgs(argv: string[]): {
  origin?: { latitude: number; longitude: number };
  destination?: { latitude: number; longitude: number };
  vehicleCategory?: VehicleRoutingCategory;
  alternatives?: number;
  debug: boolean;
} {
  const parsed: ReturnType<typeof parseArgs> = { debug: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (arg === '--debug') {
      parsed.debug = true;
      continue;
    }

    if (!value) {
      throw new Error(`Missing value for ${arg}.`);
    }

    if (arg === '--origin') {
      parsed.origin = parseCoordinate(value);
      index += 1;
    } else if (arg === '--destination') {
      parsed.destination = parseCoordinate(value);
      index += 1;
    } else if (arg === '--vehicle-category') {
      parsed.vehicleCategory = parseVehicleCategory(value);
      index += 1;
    } else if (arg === '--alternatives') {
      parsed.alternatives = Number(value);
      index += 1;
    } else {
      throw new Error(`Unknown argument ${arg}.`);
    }
  }

  return parsed;
}

function parseCoordinate(value: string): {
  latitude: number;
  longitude: number;
} {
  const [latitude, longitude] = value.split(',').map(Number);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`Invalid coordinate: ${value}.`);
  }

  return { latitude, longitude };
}

function parseVehicleCategory(value: string): VehicleRoutingCategory {
  if (
    value === 'car' ||
    value === 'motorcycle' ||
    value === 'maxi-scooter' ||
    value === 'low-speed-scooter'
  ) {
    return value;
  }

  throw new Error(`Unsupported vehicle category: ${value}.`);
}

function sanitizeFilename(path: string): string {
  return `${path.replaceAll('/', '_').replace(/^_/, '')}.json`;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error.';
  console.error(`Valhalla routing verification failed: ${message}`);
  process.exitCode = 1;
});
