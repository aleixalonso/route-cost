import {
  calculateFuelPriceSuggestion,
  type FuelProduct,
  fuelProducts,
  selectNearbyStations,
} from '@route-cost/fuel-prices';

import { SpainFuelPriceProvider } from '../apps/api/src/modules/fuel-prices/infrastructure/countries/spain/spain-fuel-price.provider';
import { SpainFuelPriceHttpClient } from '../apps/api/src/modules/fuel-prices/infrastructure/countries/spain/spain-fuel-price-http.client';

const args = parseArgs(process.argv.slice(2));

async function main(): Promise<void> {
  const httpClient = new SpainFuelPriceHttpClient({
    sourceUrl:
      process.env.SPAIN_FUEL_PRICE_SOURCE_URL ??
      'https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/EstacionesTerrestres/',
    timeoutMs: Number(
      process.env.SPAIN_FUEL_PRICES_REQUEST_TIMEOUT_MS ?? 10_000,
    ),
  });
  const provider = new SpainFuelPriceProvider(httpClient, {
    cacheTtlMs: Number(process.env.SPAIN_FUEL_PRICES_CACHE_TTL_MS ?? 1_800_000),
    staleIfErrorMs: Number(
      process.env.SPAIN_FUEL_PRICES_STALE_IF_ERROR_MS ?? 21_600_000,
    ),
  });
  const result = await provider.getNearbyFuelPrices({
    coordinate: args.coordinate,
    fuelProduct: args.fuelProduct,
  });
  const selected = selectNearbyStations(
    result,
    args.coordinate,
    args.fuelProduct,
    {
      radiusStepsMetres: parseRadiusSteps(
        process.env.FUEL_PRICE_RADIUS_STEPS_METRES ?? '5000,10000,25000',
      ),
      minStationCount: Number(process.env.FUEL_PRICE_MIN_STATION_COUNT ?? 5),
      maxStationCount: Number(process.env.FUEL_PRICE_MAX_STATION_COUNT ?? 30),
      maxDataAgeHours: Number(process.env.FUEL_PRICE_MAX_DATA_AGE_HOURS ?? 72),
    },
  );

  console.log(`Country: ${result.countryCode}`);
  console.log(`Currency: ${result.currency}`);
  console.log(`Fuel product: ${args.fuelProduct}`);
  console.log(`Normalized station count: ${result.stations.length}`);
  console.log(`Selected nearby station count: ${selected.stations.length}`);
  console.log(`Radius metres: ${selected.radiusMetres}`);
  console.log(`Source updated at: ${result.sourceUpdatedAt ?? 'unknown'}`);
  console.log(`Retrieved at: ${result.retrievedAt}`);
  console.log(`Stale fallback: ${result.isStale === true ? 'yes' : 'no'}`);

  if (selected.stations.length === 0) {
    console.log('No nearby prices found.');
    return;
  }

  const suggestion = calculateFuelPriceSuggestion({
    result,
    fuelProduct: args.fuelProduct,
    selected,
  });

  console.log(`Median: ${suggestion.suggestedPricePerLitre.amount}`);
  console.log(`Minimum: ${suggestion.minimumPricePerLitre}`);
  console.log(`Maximum: ${suggestion.maximumPricePerLitre}`);
  console.log(`Attribution: ${suggestion.attribution?.label ?? 'none'}`);
  console.log(`Attribution URL: ${suggestion.attribution?.url ?? 'none'}`);
}

function parseArgs(argv: readonly string[]): {
  readonly coordinate: {
    readonly latitude: number;
    readonly longitude: number;
  };
  readonly fuelProduct: FuelProduct;
} {
  let coordinate: { latitude: number; longitude: number } | undefined;
  let fuelProduct: FuelProduct | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (value === undefined) {
      throw new Error(`Missing value for ${arg}.`);
    }

    if (arg === '--coordinate') {
      coordinate = parseCoordinate(value);
      index += 1;
    } else if (arg === '--fuel-product') {
      fuelProduct = parseFuelProduct(value);
      index += 1;
    } else {
      throw new Error(`Unknown argument ${arg}.`);
    }
  }

  if (coordinate === undefined || fuelProduct === undefined) {
    throw new Error('--coordinate and --fuel-product are required.');
  }

  return { coordinate, fuelProduct };
}

function parseCoordinate(value: string): {
  readonly latitude: number;
  readonly longitude: number;
} {
  const [latitude, longitude] = value.split(',').map(Number);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error(`Invalid coordinate: ${value}.`);
  }

  return { latitude, longitude };
}

function parseFuelProduct(value: string): FuelProduct {
  if (fuelProducts.includes(value as FuelProduct)) {
    return value as FuelProduct;
  }

  throw new Error(`Unsupported fuel product: ${value}.`);
}

function parseRadiusSteps(value: string): readonly number[] {
  return value.split(',').map((part) => Number(part.trim()));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error.';
  console.error(`Spain fuel-price verification failed: ${message}`);
  process.exitCode = 1;
});
