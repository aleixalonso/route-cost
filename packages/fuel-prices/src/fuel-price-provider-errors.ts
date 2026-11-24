export class FuelPriceProviderUnavailableError extends Error {
  public constructor(message = 'Fuel price provider is unavailable.') {
    super(message);
    this.name = 'FuelPriceProviderUnavailableError';
  }
}

export class FuelPriceProviderTimeoutError extends Error {
  public constructor(message = 'Fuel price provider timed out.') {
    super(message);
    this.name = 'FuelPriceProviderTimeoutError';
  }
}

export class FuelPriceProviderInvalidResponseError extends Error {
  public constructor(message = 'Fuel price provider returned invalid data.') {
    super(message);
    this.name = 'FuelPriceProviderInvalidResponseError';
  }
}
