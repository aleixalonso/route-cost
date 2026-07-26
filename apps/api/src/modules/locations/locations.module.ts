import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import type { Environment } from '../../config/environment';
import {
  AutocompleteLocationsService,
  LOCATION_SERVICE_CONFIG,
} from './application/autocomplete-locations.service';
import { GetLocationDetailsService } from './application/get-location-details.service';
import { ReverseGeocodeService } from './application/reverse-geocode.service';
import { SearchLocationsService } from './application/search-locations.service';
import { GEOCODING_PROVIDER } from './geocoding-provider.token';
import { MockGeocodingProvider } from './infrastructure/mock/mock-geocoding.provider';
import {
  STADIA_GEOCODING_CONFIG,
  StadiaGeocodingHttpClient,
  StadiaGeocodingProvider,
  toStadiaGeocodingConfig,
} from './infrastructure/stadia';
import { LocationsController } from './presentation/locations.controller';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
  ],
  controllers: [LocationsController],
  providers: [
    AutocompleteLocationsService,
    SearchLocationsService,
    GetLocationDetailsService,
    ReverseGeocodeService,
    MockGeocodingProvider,
    StadiaGeocodingHttpClient,
    StadiaGeocodingProvider,
    {
      provide: STADIA_GEOCODING_CONFIG,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Environment, true>) =>
        toStadiaGeocodingConfig(getEnvironment(configService)),
    },
    {
      provide: LOCATION_SERVICE_CONFIG,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Environment, true>) => ({
        defaultLimit: configService.get('STADIA_GEOCODING_DEFAULT_LIMIT', {
          infer: true,
        }),
        maxLimit: configService.get('STADIA_GEOCODING_MAX_LIMIT', {
          infer: true,
        }),
      }),
    },
    {
      provide: GEOCODING_PROVIDER,
      inject: [ConfigService, MockGeocodingProvider, StadiaGeocodingProvider],
      useFactory: (
        configService: ConfigService<Environment, true>,
        mockGeocodingProvider: MockGeocodingProvider,
        stadiaGeocodingProvider: StadiaGeocodingProvider,
      ) =>
        configService.get('GEOCODING_PROVIDER', { infer: true }) === 'stadia'
          ? stadiaGeocodingProvider
          : mockGeocodingProvider,
    },
  ],
})
export class LocationsModule {}

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
  };
}
