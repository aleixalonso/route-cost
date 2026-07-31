export const fuelProducts = ['petrol-95-e5', 'diesel-a'] as const;

export type FuelProduct = (typeof fuelProducts)[number];

export interface GeographicCoordinate {
  readonly latitude: number;
  readonly longitude: number;
}

export interface MoneyPerLitre {
  readonly amount: number;
  readonly currency: string;
}

export interface StationFuelPrice {
  readonly fuelProduct: FuelProduct;
  readonly pricePerLitre: MoneyPerLitre;
  readonly updatedAt?: string;
}

export interface FuelStation {
  readonly id: string;
  readonly name?: string;
  readonly brand?: string;
  readonly coordinate: GeographicCoordinate;
  readonly address?: string;
  readonly locality?: string;
  readonly region?: string;
  readonly countryCode: string;
  readonly prices: readonly StationFuelPrice[];
}

export interface NearbyFuelPricesRequest {
  readonly coordinate: GeographicCoordinate;
  readonly fuelProduct: FuelProduct;
}

export interface NearbyFuelPricesResult {
  readonly countryCode: string;
  readonly currency: string;
  readonly sourceUpdatedAt?: string;
  readonly retrievedAt: string;
  readonly stations: readonly FuelStation[];
  readonly attribution?: {
    readonly label: string;
    readonly url?: string;
  };
  readonly isStale?: boolean;
}

export interface CountryFuelPriceProvider {
  readonly countryCode: string;
  getNearbyFuelPrices(
    request: NearbyFuelPricesRequest,
  ): Promise<NearbyFuelPricesResult>;
}

export interface CountryFuelPriceProviderRegistry {
  getProvider(countryCode: string): CountryFuelPriceProvider | undefined;
}

export type FuelPriceSuggestionMethod = 'nearby-median';

export interface FuelPriceSuggestion {
  readonly suggestedPricePerLitre: MoneyPerLitre;
  readonly method: FuelPriceSuggestionMethod;
  readonly stationCount: number;
  readonly radiusMetres: number;
  readonly minimumPricePerLitre: number;
  readonly maximumPricePerLitre: number;
  readonly nearestStationDistanceMetres: number;
  readonly farthestStationDistanceMetres: number;
  readonly sourceUpdatedAt?: string;
  readonly retrievedAt: string;
  readonly oldestPriceUpdatedAt?: string;
  readonly newestPriceUpdatedAt?: string;
  readonly isStale: boolean;
  readonly attribution?: {
    readonly label: string;
    readonly url?: string;
  };
}

export interface FuelPriceSearchConfig {
  readonly radiusStepsMetres: readonly number[];
  readonly minStationCount: number;
  readonly maxStationCount: number;
  readonly maxDataAgeHours: number;
}

export interface StationWithSelectedPrice {
  readonly station: FuelStation;
  readonly price: StationFuelPrice;
  readonly distanceMetres: number;
}

export interface SelectedNearbyStations {
  readonly stations: readonly StationWithSelectedPrice[];
  readonly radiusMetres: number;
}

export class CountryFuelPriceProviderMap implements CountryFuelPriceProviderRegistry {
  private readonly providers: ReadonlyMap<string, CountryFuelPriceProvider>;

  public constructor(providers: readonly CountryFuelPriceProvider[]) {
    const providerMap = new Map<string, CountryFuelPriceProvider>();

    for (const provider of providers) {
      const countryCode = normalizeCountryCode(provider.countryCode);

      if (provider.countryCode !== countryCode) {
        throw new Error('Provider country code must be normalized.');
      }

      if (providerMap.has(countryCode)) {
        throw new Error(`Duplicate fuel price provider: ${countryCode}.`);
      }

      providerMap.set(countryCode, provider);
    }

    this.providers = providerMap;
  }

  public getProvider(
    countryCode: string,
  ): CountryFuelPriceProvider | undefined {
    return this.providers.get(normalizeCountryCode(countryCode));
  }
}

export function normalizeCountryCode(countryCode: string): string {
  const normalizedCountryCode = countryCode.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
    throw new Error('Country code must be ISO 3166-1 alpha-2.');
  }

  return normalizedCountryCode;
}

export function isFuelProduct(value: string): value is FuelProduct {
  return fuelProducts.includes(value as FuelProduct);
}

export function calculateDistanceMetres(
  from: GeographicCoordinate,
  to: GeographicCoordinate,
): number {
  assertValidCoordinate(from);
  assertValidCoordinate(to);

  if (from.latitude === to.latitude && from.longitude === to.longitude) {
    return 0;
  }

  const earthRadiusMetres = 6_371_000;
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMetres * c;
}

export function calculateMedian(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error('Cannot calculate median of empty values.');
  }

  for (const value of values) {
    if (!Number.isFinite(value)) {
      throw new Error('Median values must be finite.');
    }
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middleIndex] as number;
  }

  return (
    ((sortedValues[middleIndex - 1] as number) +
      (sortedValues[middleIndex] as number)) /
    2
  );
}

export function selectNearbyStations(
  result: NearbyFuelPricesResult,
  coordinate: GeographicCoordinate,
  fuelProduct: FuelProduct,
  config: FuelPriceSearchConfig,
  now: Date = new Date(),
): SelectedNearbyStations {
  validateSearchConfig(config);
  const maxAgeMs = config.maxDataAgeHours * 60 * 60 * 1_000;
  const stationsById = new Map<string, StationWithSelectedPrice>();

  for (const station of result.stations) {
    const selectedPrice = getSelectedPrice(station, fuelProduct, now, maxAgeMs);

    if (selectedPrice === undefined) {
      continue;
    }

    const distanceMetres = calculateDistanceMetres(
      coordinate,
      station.coordinate,
    );
    const current = stationsById.get(station.id);
    const candidate = { station, price: selectedPrice, distanceMetres };

    if (
      current === undefined ||
      compareSelectedStation(candidate, current) < 0
    ) {
      stationsById.set(station.id, candidate);
    }
  }

  const sortedStations = [...stationsById.values()].sort(
    (left, right) =>
      left.distanceMetres - right.distanceMetres ||
      left.station.id.localeCompare(right.station.id),
  );

  let radiusMetres = config.radiusStepsMetres.at(-1) as number;
  let selectedStations: readonly StationWithSelectedPrice[] = [];

  for (const radiusStepMetres of config.radiusStepsMetres) {
    const stationsInRadius = sortedStations.filter(
      (station) => station.distanceMetres <= radiusStepMetres,
    );

    radiusMetres = radiusStepMetres;
    selectedStations = stationsInRadius;

    if (stationsInRadius.length >= config.minStationCount) {
      break;
    }
  }

  return {
    radiusMetres,
    stations: selectedStations.slice(0, config.maxStationCount),
  };
}

export function calculateFuelPriceSuggestion(input: {
  readonly result: NearbyFuelPricesResult;
  readonly selected: SelectedNearbyStations;
}): FuelPriceSuggestion {
  if (input.selected.stations.length === 0) {
    throw new Error('Cannot suggest fuel price without selected stations.');
  }

  const amounts = input.selected.stations.map(
    (station) => station.price.pricePerLitre.amount,
  );
  const updatedAtValues = input.selected.stations
    .map((station) => station.price.updatedAt)
    .filter((value): value is string => value !== undefined)
    .sort();
  const suggestion = {
    suggestedPricePerLitre: {
      amount: calculateMedian(amounts),
      currency: input.result.currency,
    },
    method: 'nearby-median',
    stationCount: input.selected.stations.length,
    radiusMetres: input.selected.radiusMetres,
    minimumPricePerLitre: Math.min(...amounts),
    maximumPricePerLitre: Math.max(...amounts),
    nearestStationDistanceMetres: input.selected.stations[0]
      ?.distanceMetres as number,
    farthestStationDistanceMetres: input.selected.stations.at(-1)
      ?.distanceMetres as number,
    ...(input.result.sourceUpdatedAt === undefined
      ? {}
      : { sourceUpdatedAt: input.result.sourceUpdatedAt }),
    retrievedAt: input.result.retrievedAt,
    ...(updatedAtValues.length === 0
      ? {}
      : {
          oldestPriceUpdatedAt: updatedAtValues[0] as string,
          newestPriceUpdatedAt: updatedAtValues.at(-1) as string,
        }),
    isStale: input.result.isStale ?? false,
    ...(input.result.attribution === undefined
      ? {}
      : { attribution: input.result.attribution }),
  } satisfies FuelPriceSuggestion;

  return suggestion;
}

function assertValidCoordinate(coordinate: GeographicCoordinate): void {
  if (
    !Number.isFinite(coordinate.latitude) ||
    coordinate.latitude < -90 ||
    coordinate.latitude > 90 ||
    !Number.isFinite(coordinate.longitude) ||
    coordinate.longitude < -180 ||
    coordinate.longitude > 180
  ) {
    throw new Error('Invalid geographic coordinate.');
  }
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function validateSearchConfig(config: FuelPriceSearchConfig): void {
  if (
    config.radiusStepsMetres.length === 0 ||
    config.minStationCount < 1 ||
    config.maxStationCount < config.minStationCount ||
    config.maxDataAgeHours <= 0
  ) {
    throw new Error('Invalid fuel price search configuration.');
  }

  let previous = 0;

  for (const step of config.radiusStepsMetres) {
    if (!Number.isInteger(step) || step <= previous) {
      throw new Error('Radius steps must be strictly increasing.');
    }

    previous = step;
  }
}

function getSelectedPrice(
  station: FuelStation,
  fuelProduct: FuelProduct,
  now: Date,
  maxAgeMs: number,
): StationFuelPrice | undefined {
  const prices = station.prices
    .filter((price) => {
      if (
        price.fuelProduct !== fuelProduct ||
        price.pricePerLitre.amount <= 0 ||
        !Number.isFinite(price.pricePerLitre.amount)
      ) {
        return false;
      }

      if (price.updatedAt === undefined) {
        return true;
      }

      const updatedAt = Date.parse(price.updatedAt);

      return (
        Number.isFinite(updatedAt) && now.getTime() - updatedAt <= maxAgeMs
      );
    })
    .sort(compareStationFuelPrice);

  return prices[0];
}

function compareSelectedStation(
  left: StationWithSelectedPrice,
  right: StationWithSelectedPrice,
): number {
  return compareStationFuelPrice(left.price, right.price);
}

function compareStationFuelPrice(
  left: StationFuelPrice,
  right: StationFuelPrice,
): number {
  if (left.updatedAt !== right.updatedAt) {
    if (left.updatedAt === undefined) {
      return 1;
    }

    if (right.updatedAt === undefined) {
      return -1;
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  }

  return left.pricePerLitre.amount - right.pricePerLitre.amount;
}
