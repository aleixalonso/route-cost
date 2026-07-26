export class InvalidFuelPriceError extends RangeError {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidFuelPriceError';
  }
}
