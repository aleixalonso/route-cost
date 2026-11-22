import type * as Geocoding from '../index.js';
import type { StadiaGeocodingConfig } from './stadia-geocoding-config.js';
import { StadiaGeocodingHttpClient } from './stadia-geocoding-http-client.js';
import {
  normalizeAutocompleteResponse,
  normalizePlaceDetailsResponse,
  normalizeReverseResponse,
  normalizeSearchResponse,
} from './stadia-geocoding-normalizer.js';
import {
  buildAutocompleteUrl,
  buildPlaceDetailsUrl,
  buildReverseUrl,
  buildSearchUrl,
} from './stadia-geocoding-request.builder.js';

export interface StadiaGeocodingProviderConfig extends StadiaGeocodingConfig {
  fetchImpl?: typeof fetch;
}

export function createStadiaGeocodingProvider(
  config: StadiaGeocodingProviderConfig,
): Geocoding.GeocodingProvider {
  return new StadiaGeocodingProvider(
    new StadiaGeocodingHttpClient(config),
    config,
  );
}

class StadiaGeocodingProvider implements Geocoding.GeocodingProvider {
  public constructor(
    private readonly httpClient: StadiaGeocodingHttpClient,
    private readonly config: StadiaGeocodingConfig,
  ) {}

  public async autocompleteLocations(
    request: Geocoding.AutocompleteLocationsRequest,
  ): Promise<Geocoding.AutocompleteLocationsResult> {
    const response = await this.httpClient.autocomplete(
      buildAutocompleteUrl(request, this.config),
    );
    return normalizeAutocompleteResponse(response);
  }

  public async searchLocations(
    request: Geocoding.SearchLocationsRequest,
  ): Promise<Geocoding.SearchLocationsResult> {
    const response = await this.httpClient.search(
      buildSearchUrl(request, this.config),
    );
    return normalizeSearchResponse(response);
  }

  public async getLocationDetails(
    request: Geocoding.GetLocationDetailsRequest,
  ): Promise<Geocoding.LocationDetailsResult> {
    const response = await this.httpClient.placeDetails(
      buildPlaceDetailsUrl(request, this.config),
    );
    return normalizePlaceDetailsResponse(response, request.placeId);
  }

  public async reverseGeocode(
    request: Geocoding.ReverseGeocodeRequest,
  ): Promise<Geocoding.ReverseGeocodeResult> {
    const response = await this.httpClient.reverse(
      buildReverseUrl(request, this.config),
    );
    return normalizeReverseResponse(response);
  }
}
