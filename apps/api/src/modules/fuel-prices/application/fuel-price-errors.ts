export class VehicleFuelProductUnsupportedError extends Error {
  public constructor(message = 'Vehicle has no supported fuel product.') {
    super(message);
    this.name = 'VehicleFuelProductUnsupportedError';
  }
}
