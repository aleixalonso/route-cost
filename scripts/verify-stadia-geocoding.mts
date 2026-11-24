import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { StadiaGeocodingConfig } from '@route-cost/geocoding';
import { StadiaGeocodingHttpClient } from '@route-cost/geocoding';
import {
  normalizeAutocompleteResponse,
  normalizePlaceDetailsResponse,
  normalizeReverseResponse,
  normalizeSearchResponse,
} from '@route-cost/geocoding';
import {
  buildAutocompleteUrl,
  buildPlaceDetailsUrl,
  buildReverseUrl,
  buildSearchUrl,
} from '@route-cost/geocoding';

type Operation = 'autocomplete' | 'search' | 'details' | 'reverse';

const args = parseArgs(process.argv.slice(2));

async function main(): Promise<void> {
  await loadApiEnv();

  const apiKey = process.env.STADIA_GEOCODING_API_KEY;

  if (!apiKey) {
    throw new Error('STADIA_GEOCODING_API_KEY is required.');
  }

  const config: StadiaGeocodingConfig = {
    baseUrl:
      process.env.STADIA_GEOCODING_BASE_URL ?? 'https://api-eu.stadiamaps.com',
    autocompletePath:
      process.env.STADIA_GEOCODING_AUTOCOMPLETE_PATH ??
      '/geocoding/v2/autocomplete',
    searchPath:
      process.env.STADIA_GEOCODING_SEARCH_PATH ?? '/geocoding/v2/search',
    placeDetailsPath:
      process.env.STADIA_GEOCODING_PLACE_DETAILS_PATH ??
      '/geocoding/v2/place_details',
    reversePath:
      process.env.STADIA_GEOCODING_REVERSE_PATH ?? '/geocoding/v2/reverse',
    apiKey,
    clientId: process.env.STADIA_GEOCODING_CLIENT_ID ?? 'route-cost',
    requestTimeoutMs: Number(
      process.env.STADIA_GEOCODING_REQUEST_TIMEOUT_MS ?? 5_000,
    ),
    defaultLimit: Number(process.env.STADIA_GEOCODING_DEFAULT_LIMIT ?? 5),
    maxLimit: Number(process.env.STADIA_GEOCODING_MAX_LIMIT ?? 10),
  };
  const httpClient = new StadiaGeocodingHttpClient(config);

  if (args.operation === 'autocomplete') {
    const request = {
      query: required(args.query, '--query'),
      limit: args.limit ?? config.defaultLimit,
      ...(args.language === undefined ? {} : { language: args.language }),
      ...(args.countryCode === undefined
        ? {}
        : { countryCode: args.countryCode }),
      ...(args.focus === undefined ? {} : { focus: args.focus }),
    };
    const result = normalizeAutocompleteResponse(
      await httpClient.autocomplete(buildAutocompleteUrl(request, config)),
    );
    printResult(result);
    return;
  }

  if (args.operation === 'search') {
    const request = {
      query: required(args.query, '--query'),
      limit: args.limit ?? config.defaultLimit,
      ...(args.language === undefined ? {} : { language: args.language }),
      ...(args.countryCode === undefined
        ? {}
        : { countryCode: args.countryCode }),
      ...(args.focus === undefined ? {} : { focus: args.focus }),
    };
    const result = normalizeSearchResponse(
      await httpClient.search(buildSearchUrl(request, config)),
    );
    printResult(result);
    return;
  }

  if (args.operation === 'details') {
    const request = {
      placeId: required(args.placeId, '--place-id'),
      ...(args.language === undefined ? {} : { language: args.language }),
    };
    const result = normalizePlaceDetailsResponse(
      await httpClient.placeDetails(buildPlaceDetailsUrl(request, config)),
      request.placeId,
    );
    printResult(result);
    return;
  }

  const request = {
    coordinate: required(args.coordinate, '--coordinate'),
    limit: args.limit ?? config.defaultLimit,
    ...(args.language === undefined ? {} : { language: args.language }),
    ...(args.countryCode === undefined
      ? {}
      : { countryCode: args.countryCode }),
  };
  const result = normalizeReverseResponse(
    await httpClient.reverse(buildReverseUrl(request, config)),
  );
  printResult(result);
}

async function loadApiEnv(): Promise<void> {
  try {
    const contents = await readFile(
      join(process.cwd(), 'apps/api/.env'),
      'utf8',
    );

    for (const line of contents.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);

      if (parsed === undefined || process.env[parsed.key] !== undefined) {
        continue;
      }

      process.env[parsed.key] = parsed.value;
    }
  } catch {
    return;
  }
}

function parseEnvLine(
  line: string,
): { key: string; value: string } | undefined {
  const trimmed = line.trim();

  if (trimmed.length === 0 || trimmed.startsWith('#')) {
    return undefined;
  }

  const separatorIndex = trimmed.indexOf('=');

  if (separatorIndex <= 0) {
    return undefined;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  const rawValue = trimmed.slice(separatorIndex + 1).trim();
  const value =
    (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
    (rawValue.startsWith("'") && rawValue.endsWith("'"))
      ? rawValue.slice(1, -1)
      : rawValue;

  return { key, value };
}

function printResult(result: unknown): void {
  const count = getResultCount(result);
  console.log(`Result count: ${count}`);
  console.log(JSON.stringify(result, null, 2));
}

function getResultCount(result: unknown): number {
  if (
    typeof result === 'object' &&
    result !== null &&
    'items' in result &&
    Array.isArray(result.items)
  ) {
    return result.items.length;
  }

  return typeof result === 'object' && result !== null && 'location' in result
    ? 1
    : 0;
}

function parseArgs(argv: string[]): {
  operation: Operation;
  query?: string;
  placeId?: string;
  coordinate?: { latitude: number; longitude: number };
  focus?: { latitude: number; longitude: number };
  limit?: number;
  language?: string;
  countryCode?: string;
} {
  const operation = argv[0];

  if (!isOperation(operation)) {
    throw new Error(
      'First argument must be autocomplete, search, details, or reverse.',
    );
  }

  const parsed: ReturnType<typeof parseArgs> = { operation };

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (!value) {
      throw new Error(`Missing value for ${arg}.`);
    }

    if (arg === '--query') {
      parsed.query = value;
    } else if (arg === '--place-id') {
      parsed.placeId = value;
    } else if (arg === '--coordinate') {
      parsed.coordinate = parseCoordinate(value);
    } else if (arg === '--focus') {
      parsed.focus = parseCoordinate(value);
    } else if (arg === '--limit') {
      parsed.limit = Number(value);
    } else if (arg === '--language') {
      parsed.language = value;
    } else if (arg === '--country-code') {
      parsed.countryCode = value;
    } else {
      throw new Error(`Unknown argument ${arg}.`);
    }

    index += 1;
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

function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function isOperation(value: string | undefined): value is Operation {
  return (
    value === 'autocomplete' ||
    value === 'search' ||
    value === 'details' ||
    value === 'reverse'
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error.';
  console.error(`Stadia geocoding verification failed: ${message}`);
  process.exitCode = 1;
});
