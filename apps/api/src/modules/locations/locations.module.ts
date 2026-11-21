import { Module } from '@nestjs/common';

import type { Environment } from '../../config/environment';
import { EnvironmentModule } from '../../config/environment.module';
import { ENVIRONMENT } from '../../config/environment.token';
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
  imports: [EnvironmentModule],
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
      inject: [ENVIRONMENT],
      useFactory: (environment: Environment) =>
        toStadiaGeocodingConfig(environment),
    },
    {
      provide: LOCATION_SERVICE_CONFIG,
      inject: [ENVIRONMENT],
      useFactory: (environment: Environment) => ({
        defaultLimit: environment.STADIA_GEOCODING_DEFAULT_LIMIT,
        maxLimit: environment.STADIA_GEOCODING_MAX_LIMIT,
      }),
    },
    {
      provide: GEOCODING_PROVIDER,
      inject: [ENVIRONMENT, MockGeocodingProvider, StadiaGeocodingProvider],
      useFactory: (
        environment: Environment,
        mockGeocodingProvider: MockGeocodingProvider,
        stadiaGeocodingProvider: StadiaGeocodingProvider,
      ) =>
        environment.GEOCODING_PROVIDER === 'stadia'
          ? stadiaGeocodingProvider
          : mockGeocodingProvider,
    },
  ],
  exports: [GEOCODING_PROVIDER],
})
export class LocationsModule {}
