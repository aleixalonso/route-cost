export class VehicleNotFoundApplicationError extends Error {
  public constructor() {
    super('The requested vehicle was not found.');
    this.name = 'VehicleNotFoundApplicationError';
  }
}
