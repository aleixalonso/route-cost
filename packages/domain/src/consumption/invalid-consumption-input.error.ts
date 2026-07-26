export class InvalidConsumptionInputError extends RangeError {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidConsumptionInputError';
  }
}
