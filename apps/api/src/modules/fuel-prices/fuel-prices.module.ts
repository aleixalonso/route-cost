import { Module } from '@nestjs/common';
import {
  type CountryFuelPriceProvider,
  createSpainFuelPriceProvider,
} from '@route-cost/fuel-prices';

import type { Environment } from '../../config/environment';
import { EnvironmentModule } from '../../config/environment.module';
import { ENVIRONMENT } from '../../config/environment.token';
import { LocationsModule } from '../locations/locations.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { ResolveRequestedFuelProductService } from './application/resolve-requested-fuel-product.service';
import {
  SuggestFuelPriceService,
  toFuelPriceSearchConfig,
} from './application/suggest-fuel-price.service';
import { CountryFuelPriceProviderRegistryAdapter } from './infrastructure/country/country-fuel-price-provider.registry';
import { GeocodingCountryResolver } from './infrastructure/country/geocoding-country-resolver';
import { MockCountryResolver } from './infrastructure/mock/mock-country-resolver';
import { MockSpainFuelPriceProvider } from './infrastructure/mock/mock-spain-fuel-price.provider';
import { FuelPricesController } from './presentation/fuel-prices.controller';
import { COUNTRY_FUEL_PRICE_PROVIDER_REGISTRY } from './tokens/country-fuel-price-provider-registry.token';
import { COUNTRY_RESOLVER } from './tokens/country-resolver.token';
import {
  SPAIN_FUEL_PRICE_HTTP_CLIENT_CONFIG,
  SPAIN_FUEL_PRICE_PROVIDER_CONFIG,
} from './tokens/spain-fuel-price.tokens';

@Module({
  imports: [EnvironmentModule, LocationsModule, VehiclesModule],
  controllers: [FuelPricesController],
  providers: [
    ResolveRequestedFuelProductService,
    SuggestFuelPriceService,
    GeocodingCountryResolver,
    MockCountryResolver,
    MockSpainFuelPriceProvider,
    {
      provide: 'FUEL_PRICE_SEARCH_CONFIG',
      inject: [ENVIRONMENT],
      useFactory: (environment: Environment) =>
        toFuelPriceSearchConfig(environment),
    },
    {
      provide: SPAIN_FUEL_PRICE_HTTP_CLIENT_CONFIG,
      inject: [ENVIRONMENT],
      useFactory: (environment: Environment) => ({
        sourceUrl: environment.SPAIN_FUEL_PRICE_SOURCE_URL,
        timeoutMs: environment.SPAIN_FUEL_PRICES_REQUEST_TIMEOUT_MS,
      }),
    },
    {
      provide: SPAIN_FUEL_PRICE_PROVIDER_CONFIG,
      inject: [ENVIRONMENT],
      useFactory: (environment: Environment) => ({
        cacheTtlMs: environment.SPAIN_FUEL_PRICES_CACHE_TTL_MS,
        staleIfErrorMs: environment.SPAIN_FUEL_PRICES_STALE_IF_ERROR_MS,
      }),
    },
    {
      provide: COUNTRY_RESOLVER,
      inject: [ENVIRONMENT, GeocodingCountryResolver, MockCountryResolver],
      useFactory: (
        environment: Environment,
        geocodingCountryResolver: GeocodingCountryResolver,
        mockCountryResolver: MockCountryResolver,
      ) =>
        environment.FUEL_PRICE_PROVIDER_MODE === 'live'
          ? geocodingCountryResolver
          : mockCountryResolver,
    },
    {
      provide: COUNTRY_FUEL_PRICE_PROVIDER_REGISTRY,
      inject: [
        ENVIRONMENT,
        SPAIN_FUEL_PRICE_HTTP_CLIENT_CONFIG,
        SPAIN_FUEL_PRICE_PROVIDER_CONFIG,
        MockSpainFuelPriceProvider,
      ],
      useFactory: (
        environment: Environment,
        httpClientConfig: {
          readonly sourceUrl: string;
          readonly timeoutMs: number;
        },
        providerConfig: {
          readonly cacheTtlMs: number;
          readonly staleIfErrorMs: number;
        },
        mockSpainFuelPriceProvider: MockSpainFuelPriceProvider,
      ) => {
        const providers: readonly CountryFuelPriceProvider[] = [
          environment.FUEL_PRICE_PROVIDER_MODE === 'live'
            ? createSpainFuelPriceProvider({
                sourceUrl: httpClientConfig.sourceUrl,
                requestTimeoutMs: httpClientConfig.timeoutMs,
                ...providerConfig,
              })
            : mockSpainFuelPriceProvider,
        ];

        return new CountryFuelPriceProviderRegistryAdapter(providers);
      },
    },
  ],
})
export class FuelPricesModule {}
