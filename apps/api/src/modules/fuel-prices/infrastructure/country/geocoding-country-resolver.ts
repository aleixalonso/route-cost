import { Inject, Injectable } from '@nestjs/common';
import { normalizeCountryCode } from '@route-cost/fuel-prices';
import type { GeocodingProvider } from '@route-cost/geocoding';

import { GEOCODING_PROVIDER } from '../../../locations/geocoding-provider.token';
import type {
  CountryResolver,
  ResolvedCountry,
} from '../../application/country-resolver';

@Injectable()
export class GeocodingCountryResolver implements CountryResolver {
  public constructor(
    @Inject(GEOCODING_PROVIDER)
    private readonly geocodingProvider: GeocodingProvider,
  ) {}

  public async resolveCountry(coordinate: {
    readonly latitude: number;
    readonly longitude: number;
  }): Promise<ResolvedCountry | undefined> {
    const result = await this.geocodingProvider.reverseGeocode({
      coordinate,
      limit: 5,
      language: 'en',
    });

    for (const item of result.items) {
      if (item.countryCode === undefined) {
        continue;
      }

      try {
        const countryCode = normalizeCountryCode(item.countryCode);

        return {
          countryCode,
          ...(item.country === undefined ? {} : { countryName: item.country }),
        };
      } catch {
        continue;
      }
    }

    return undefined;
  }
}
