import { Inject, Injectable } from '@nestjs/common';
import type {
  CountryFuelPriceProviderRegistry,
  FuelPriceSearchConfig,
  FuelProduct,
  GeographicCoordinate,
} from '@route-cost/fuel-prices';
import {
  calculateFuelPriceSuggestion,
  selectNearbyStations,
} from '@route-cost/fuel-prices';

import {
  type Environment,
  parseRadiusSteps,
} from '../../../config/environment';
import { COUNTRY_FUEL_PRICE_PROVIDER_REGISTRY } from '../tokens/country-fuel-price-provider-registry.token';
import { COUNTRY_RESOLVER } from '../tokens/country-resolver.token';
import type { CountryResolver, ResolvedCountry } from './country-resolver';
import { ResolveRequestedFuelProductService } from './resolve-requested-fuel-product.service';

export type FuelPriceAvailability =
  | {
      readonly status: 'available';
      readonly country: ResolvedCountry;
      readonly fuelProduct: FuelProduct;
      readonly suggestion: ReturnType<typeof calculateFuelPriceSuggestion>;
    }
  | {
      readonly status: 'unsupported-country';
      readonly country: ResolvedCountry;
      readonly fuelProduct: FuelProduct;
    }
  | {
      readonly status: 'country-undetermined';
      readonly fuelProduct: FuelProduct;
    }
  | {
      readonly status: 'no-nearby-prices';
      readonly country: ResolvedCountry;
      readonly fuelProduct: FuelProduct;
      readonly maximumRadiusMetres: number;
    };

@Injectable()
export class SuggestFuelPriceService {
  public constructor(
    private readonly resolveRequestedFuelProduct: ResolveRequestedFuelProductService,
    @Inject(COUNTRY_RESOLVER)
    private readonly countryResolver: CountryResolver,
    @Inject(COUNTRY_FUEL_PRICE_PROVIDER_REGISTRY)
    private readonly providerRegistry: CountryFuelPriceProviderRegistry,
    @Inject('FUEL_PRICE_SEARCH_CONFIG')
    private readonly searchConfig: FuelPriceSearchConfig,
  ) {}

  public async suggest(request: {
    readonly coordinate: GeographicCoordinate;
    readonly vehicleId?: string;
    readonly fuelProduct?: FuelProduct;
  }): Promise<FuelPriceAvailability> {
    const fuelProduct = this.resolveRequestedFuelProduct.resolve(request);
    const country = await this.countryResolver.resolveCountry(
      request.coordinate,
    );

    if (country === undefined) {
      return { status: 'country-undetermined', fuelProduct };
    }

    const provider = this.providerRegistry.getProvider(country.countryCode);

    if (provider === undefined) {
      return { status: 'unsupported-country', country, fuelProduct };
    }

    const result = await provider.getNearbyFuelPrices({
      coordinate: request.coordinate,
      fuelProduct,
    });
    const selected = selectNearbyStations(
      result,
      request.coordinate,
      fuelProduct,
      this.searchConfig,
    );

    if (selected.stations.length === 0) {
      return {
        status: 'no-nearby-prices',
        country,
        fuelProduct,
        maximumRadiusMetres: this.searchConfig.radiusStepsMetres.at(
          -1,
        ) as number,
      };
    }

    return {
      status: 'available',
      country,
      fuelProduct,
      suggestion: calculateFuelPriceSuggestion({
        result,
        fuelProduct,
        selected,
      }),
    };
  }
}

export type FuelPriceSearchEnvironment = Pick<
  Environment,
  | 'FUEL_PRICE_RADIUS_STEPS_METRES'
  | 'FUEL_PRICE_MIN_STATION_COUNT'
  | 'FUEL_PRICE_MAX_STATION_COUNT'
  | 'FUEL_PRICE_MAX_DATA_AGE_HOURS'
>;

export function toFuelPriceSearchConfig(
  environment: FuelPriceSearchEnvironment,
): FuelPriceSearchConfig {
  return {
    radiusStepsMetres: parseRadiusSteps(
      environment.FUEL_PRICE_RADIUS_STEPS_METRES,
    ),
    minStationCount: environment.FUEL_PRICE_MIN_STATION_COUNT,
    maxStationCount: environment.FUEL_PRICE_MAX_STATION_COUNT,
    maxDataAgeHours: environment.FUEL_PRICE_MAX_DATA_AGE_HOURS,
  };
}
