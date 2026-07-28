import { Injectable } from '@nestjs/common';

import type {
  CountryResolver,
  ResolvedCountry,
} from '../../application/country-resolver';

@Injectable()
export class MockCountryResolver implements CountryResolver {
  public resolveCountry(coordinate: {
    readonly latitude: number;
    readonly longitude: number;
  }): Promise<ResolvedCountry | undefined> {
    if (Math.abs(coordinate.latitude - 48.8566) < 0.5) {
      return Promise.resolve({ countryCode: 'FR', countryName: 'France' });
    }

    if (
      Math.abs(coordinate.latitude) < 0.1 &&
      Math.abs(coordinate.longitude) < 0.1
    ) {
      return Promise.resolve(undefined);
    }

    return Promise.resolve({ countryCode: 'ES', countryName: 'Spain' });
  }
}
