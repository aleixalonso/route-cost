import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { CountryFuelPriceProvider } from '@route-cost/fuel-prices';

import type { Environment } from '../../config/environment';
import { LocationsModule } from '../locations/locations.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { ResolveRequestedFuelProductService } from './application/resolve-requested-fuel-product.service';
import {
  SuggestFuelPriceService,
  toFuelPriceSearchConfig,
} from './application/suggest-fuel-price.service';
import {
  SPAIN_FUEL_PRICE_PROVIDER_CONFIG,
  SpainFuelPriceProvider,
} from './infrastructure/countries/spain/spain-fuel-price.provider';
import {
  SPAIN_FUEL_PRICE_HTTP_CLIENT_CONFIG,
  SpainFuelPriceHttpClient,
} from './infrastructure/countries/spain/spain-fuel-price-http.client';
import { CountryFuelPriceProviderRegistryAdapter } from './infrastructure/country/country-fuel-price-provider.registry';
import { GeocodingCountryResolver } from './infrastructure/country/geocoding-country-resolver';
import { MockCountryResolver } from './infrastructure/mock/mock-country-resolver';
import { MockSpainFuelPriceProvider } from './infrastructure/mock/mock-spain-fuel-price.provider';
import { FuelPricesController } from './presentation/fuel-prices.controller';
import { COUNTRY_FUEL_PRICE_PROVIDER_REGISTRY } from './tokens/country-fuel-price-provider-registry.token';
import { COUNTRY_RESOLVER } from './tokens/country-resolver.token';

@Module({
  imports: [ConfigModule, LocationsModule, VehiclesModule],
  controllers: [FuelPricesController],
  providers: [
    ResolveRequestedFuelProductService,
    SuggestFuelPriceService,
    GeocodingCountryResolver,
    MockCountryResolver,
    MockSpainFuelPriceProvider,
    {
      provide: 'FUEL_PRICE_SEARCH_CONFIG',
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Environment, true>) =>
        toFuelPriceSearchConfig(getEnvironment(configService)),
    },
    {
      provide: SPAIN_FUEL_PRICE_HTTP_CLIENT_CONFIG,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Environment, true>) => ({
        sourceUrl: configService.get('SPAIN_FUEL_PRICE_SOURCE_URL', {
          infer: true,
        }),
        timeoutMs: configService.get('SPAIN_FUEL_PRICES_REQUEST_TIMEOUT_MS', {
          infer: true,
        }),
      }),
    },
    {
      provide: SpainFuelPriceHttpClient,
      inject: [SPAIN_FUEL_PRICE_HTTP_CLIENT_CONFIG],
      useFactory: (config: {
        readonly sourceUrl: string;
        readonly timeoutMs: number;
      }) => new SpainFuelPriceHttpClient(config),
    },
    {
      provide: SPAIN_FUEL_PRICE_PROVIDER_CONFIG,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Environment, true>) => ({
        cacheTtlMs: configService.get('SPAIN_FUEL_PRICES_CACHE_TTL_MS', {
          infer: true,
        }),
        staleIfErrorMs: configService.get(
          'SPAIN_FUEL_PRICES_STALE_IF_ERROR_MS',
          { infer: true },
        ),
      }),
    },
    {
      provide: SpainFuelPriceProvider,
      inject: [SpainFuelPriceHttpClient, SPAIN_FUEL_PRICE_PROVIDER_CONFIG],
      useFactory: (
        httpClient: SpainFuelPriceHttpClient,
        config: {
          readonly cacheTtlMs: number;
          readonly staleIfErrorMs: number;
        },
      ) => new SpainFuelPriceProvider(httpClient, config),
    },
    {
      provide: COUNTRY_RESOLVER,
      inject: [ConfigService, GeocodingCountryResolver, MockCountryResolver],
      useFactory: (
        configService: ConfigService<Environment, true>,
        geocodingCountryResolver: GeocodingCountryResolver,
        mockCountryResolver: MockCountryResolver,
      ) =>
        configService.get('FUEL_PRICE_PROVIDER_MODE', { infer: true }) ===
        'live'
          ? geocodingCountryResolver
          : mockCountryResolver,
    },
    {
      provide: COUNTRY_FUEL_PRICE_PROVIDER_REGISTRY,
      inject: [
        ConfigService,
        MockSpainFuelPriceProvider,
        SpainFuelPriceProvider,
      ],
      useFactory: (
        configService: ConfigService<Environment, true>,
        mockSpainFuelPriceProvider: MockSpainFuelPriceProvider,
        spainFuelPriceProvider: SpainFuelPriceProvider,
      ) => {
        const providers: readonly CountryFuelPriceProvider[] = [
          configService.get('FUEL_PRICE_PROVIDER_MODE', { infer: true }) ===
          'live'
            ? spainFuelPriceProvider
            : mockSpainFuelPriceProvider,
        ];

        return new CountryFuelPriceProviderRegistryAdapter(providers);
      },
    },
  ],
})
export class FuelPricesModule {}

function getEnvironment(
  configService: ConfigService<Environment, true>,
): Environment {
  return {
    NODE_ENV: configService.get('NODE_ENV', { infer: true }),
    HOST: configService.get('HOST', { infer: true }),
    PORT: configService.get('PORT', { infer: true }),
    CORS_ORIGINS: configService.get('CORS_ORIGINS', { infer: true }),
    SWAGGER_ENABLED: configService.get('SWAGGER_ENABLED', { infer: true }),
    ROUTING_PROVIDER: configService.get('ROUTING_PROVIDER', { infer: true }),
    VALHALLA_BASE_URL: configService.get('VALHALLA_BASE_URL', { infer: true }),
    VALHALLA_ROUTE_PATH: configService.get('VALHALLA_ROUTE_PATH', {
      infer: true,
    }),
    VALHALLA_TRACE_ATTRIBUTES_PATH: configService.get(
      'VALHALLA_TRACE_ATTRIBUTES_PATH',
      { infer: true },
    ),
    VALHALLA_API_KEY: configService.get('VALHALLA_API_KEY', { infer: true }),
    VALHALLA_CLIENT_ID: configService.get('VALHALLA_CLIENT_ID', {
      infer: true,
    }),
    VALHALLA_REQUEST_TIMEOUT_MS: configService.get(
      'VALHALLA_REQUEST_TIMEOUT_MS',
      { infer: true },
    ),
    VALHALLA_MAX_ALTERNATIVES: configService.get('VALHALLA_MAX_ALTERNATIVES', {
      infer: true,
    }),
    GEOCODING_PROVIDER: configService.get('GEOCODING_PROVIDER', {
      infer: true,
    }),
    STADIA_GEOCODING_BASE_URL: configService.get('STADIA_GEOCODING_BASE_URL', {
      infer: true,
    }),
    STADIA_GEOCODING_AUTOCOMPLETE_PATH: configService.get(
      'STADIA_GEOCODING_AUTOCOMPLETE_PATH',
      { infer: true },
    ),
    STADIA_GEOCODING_SEARCH_PATH: configService.get(
      'STADIA_GEOCODING_SEARCH_PATH',
      { infer: true },
    ),
    STADIA_GEOCODING_PLACE_DETAILS_PATH: configService.get(
      'STADIA_GEOCODING_PLACE_DETAILS_PATH',
      { infer: true },
    ),
    STADIA_GEOCODING_REVERSE_PATH: configService.get(
      'STADIA_GEOCODING_REVERSE_PATH',
      { infer: true },
    ),
    STADIA_GEOCODING_API_KEY: configService.get('STADIA_GEOCODING_API_KEY', {
      infer: true,
    }),
    STADIA_GEOCODING_CLIENT_ID: configService.get(
      'STADIA_GEOCODING_CLIENT_ID',
      { infer: true },
    ),
    STADIA_GEOCODING_REQUEST_TIMEOUT_MS: configService.get(
      'STADIA_GEOCODING_REQUEST_TIMEOUT_MS',
      { infer: true },
    ),
    STADIA_GEOCODING_DEFAULT_LIMIT: configService.get(
      'STADIA_GEOCODING_DEFAULT_LIMIT',
      { infer: true },
    ),
    STADIA_GEOCODING_MAX_LIMIT: configService.get(
      'STADIA_GEOCODING_MAX_LIMIT',
      { infer: true },
    ),
    FUEL_PRICE_PROVIDER_MODE: configService.get('FUEL_PRICE_PROVIDER_MODE', {
      infer: true,
    }),
    SPAIN_FUEL_PRICE_SOURCE_URL: configService.get(
      'SPAIN_FUEL_PRICE_SOURCE_URL',
      { infer: true },
    ),
    SPAIN_FUEL_PRICES_REQUEST_TIMEOUT_MS: configService.get(
      'SPAIN_FUEL_PRICES_REQUEST_TIMEOUT_MS',
      { infer: true },
    ),
    SPAIN_FUEL_PRICES_CACHE_TTL_MS: configService.get(
      'SPAIN_FUEL_PRICES_CACHE_TTL_MS',
      { infer: true },
    ),
    SPAIN_FUEL_PRICES_STALE_IF_ERROR_MS: configService.get(
      'SPAIN_FUEL_PRICES_STALE_IF_ERROR_MS',
      { infer: true },
    ),
    FUEL_PRICE_RADIUS_STEPS_METRES: configService.get(
      'FUEL_PRICE_RADIUS_STEPS_METRES',
      { infer: true },
    ),
    FUEL_PRICE_MIN_STATION_COUNT: configService.get(
      'FUEL_PRICE_MIN_STATION_COUNT',
      { infer: true },
    ),
    FUEL_PRICE_MAX_STATION_COUNT: configService.get(
      'FUEL_PRICE_MAX_STATION_COUNT',
      { infer: true },
    ),
    FUEL_PRICE_MAX_DATA_AGE_HOURS: configService.get(
      'FUEL_PRICE_MAX_DATA_AGE_HOURS',
      { infer: true },
    ),
  };
}
