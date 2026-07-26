export class VehicleNotFoundError extends Error {
  public constructor(vehicleId: string) {
    super(`Vehicle not found: ${vehicleId}`);
    this.name = 'VehicleNotFoundError';
  }
}
