import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  calculateValhallaRoutes,
  type ValhallaConfig,
  ValhallaHttpClient,
} from '@route-cost/routing';
import {
  summarizeRouteDistances,
  type VehicleRoutingCategory,
} from '@route-cost/routing';

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
  const httpClient = new DebuggableValhallaHttpClient(config, args.debug);
  const result = await calculateValhallaRoutes(
    {
      origin: args.origin ?? { latitude: 41.3902, longitude: 2.154 },
      destination: args.destination ?? { latitude: 41.5912, longitude: 1.5209 },
      vehicleCategory: args.vehicleCategory ?? 'maxi-scooter',
      alternatives: args.alternatives ?? 1,
    },
    config,
    httpClient,
  );

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

class DebuggableValhallaHttpClient extends ValhallaHttpClient {
  public constructor(
    config: ValhallaConfig,
    private readonly debug: boolean,
  ) {
    super(config);
  }

  protected override async handleDebugResponse(
    path: string,
    response: unknown,
  ): Promise<void> {
    if (!this.debug) {
      return;
    }

    await writeDebugResponse(path, response);
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

  if (
    latitude === undefined ||
    !Number.isFinite(latitude) ||
    longitude === undefined ||
    !Number.isFinite(longitude)
  ) {
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
