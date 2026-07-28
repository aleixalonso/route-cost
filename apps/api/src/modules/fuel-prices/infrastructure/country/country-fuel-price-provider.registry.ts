import { Injectable } from '@nestjs/common';
import {
  type CountryFuelPriceProvider,
  CountryFuelPriceProviderMap,
} from '@route-cost/fuel-prices';

@Injectable()
export class CountryFuelPriceProviderRegistryAdapter extends CountryFuelPriceProviderMap {
  public constructor(providers: readonly CountryFuelPriceProvider[]) {
    super(providers);
  }
}
