import type { GeographicCoordinate } from '@route-cost/fuel-prices';

export interface ResolvedCountry {
  readonly countryCode: string;
  readonly countryName?: string;
}

export interface CountryResolver {
  resolveCountry(
    coordinate: GeographicCoordinate,
  ): Promise<ResolvedCountry | undefined>;
}
