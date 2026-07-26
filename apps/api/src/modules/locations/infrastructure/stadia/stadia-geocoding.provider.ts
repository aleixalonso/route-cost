import { Inject, Injectable } from '@nestjs/common';
import type {
  AutocompleteLocationsRequest,
  AutocompleteLocationsResult,
  GeocodingProvider,
  GetLocationDetailsRequest,
  LocationDetailsResult,
  ReverseGeocodeRequest,
  ReverseGeocodeResult,
  SearchLocationsRequest,
  SearchLocationsResult,
} from '@route-cost/geocoding';

import {
  STADIA_GEOCODING_CONFIG,
  type StadiaGeocodingConfig,
} from './stadia-geocoding.types';
import { StadiaGeocodingHttpClient } from './stadia-geocoding-http.client';
import {
  normalizeAutocompleteResponse,
  normalizePlaceDetailsResponse,
  normalizeReverseResponse,
  normalizeSearchResponse,
} from './stadia-geocoding-normalizer';
import {
  buildAutocompleteUrl,
  buildPlaceDetailsUrl,
  buildReverseUrl,
  buildSearchUrl,
} from './stadia-geocoding-request.builder';

@Injectable()
export class StadiaGeocodingProvider implements GeocodingProvider {
  public constructor(
    private readonly httpClient: StadiaGeocodingHttpClient,
    @Inject(STADIA_GEOCODING_CONFIG)
    private readonly config: StadiaGeocodingConfig,
  ) {}

  public async autocompleteLocations(
    request: AutocompleteLocationsRequest,
  ): Promise<AutocompleteLocationsResult> {
    const response = await this.httpClient.autocomplete(
      buildAutocompleteUrl(request, this.config),
    );
    return normalizeAutocompleteResponse(response);
  }

  public async searchLocations(
    request: SearchLocationsRequest,
  ): Promise<SearchLocationsResult> {
    const response = await this.httpClient.search(
      buildSearchUrl(request, this.config),
    );
    return normalizeSearchResponse(response);
  }

  public async getLocationDetails(
    request: GetLocationDetailsRequest,
  ): Promise<LocationDetailsResult> {
    const response = await this.httpClient.placeDetails(
      buildPlaceDetailsUrl(request, this.config),
    );
    return normalizePlaceDetailsResponse(response, request.placeId);
  }

  public async reverseGeocode(
    request: ReverseGeocodeRequest,
  ): Promise<ReverseGeocodeResult> {
    const response = await this.httpClient.reverse(
      buildReverseUrl(request, this.config),
    );
    return normalizeReverseResponse(response);
  }
}
