import {
  FuelPriceProviderInvalidResponseError,
  FuelPriceProviderTimeoutError,
  FuelPriceProviderUnavailableError,
} from '../../../application/fuel-price-errors';

export class SpainFuelPriceTimeoutError extends FuelPriceProviderTimeoutError {
  public constructor() {
    super('Spain fuel price source timed out.');
    this.name = 'SpainFuelPriceTimeoutError';
  }
}

export class SpainFuelPriceUnavailableError extends FuelPriceProviderUnavailableError {
  public constructor() {
    super('Spain fuel price source is unavailable.');
    this.name = 'SpainFuelPriceUnavailableError';
  }
}

export class SpainFuelPriceInvalidResponseError extends FuelPriceProviderInvalidResponseError {
  public constructor() {
    super('Spain fuel price source returned invalid data.');
    this.name = 'SpainFuelPriceInvalidResponseError';
  }
}
