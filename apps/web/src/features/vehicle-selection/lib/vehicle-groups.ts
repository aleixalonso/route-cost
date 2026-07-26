import type { VehicleSummary } from '@route-cost/contracts';

export const vehicleCategoryLabels = {
  car: 'Car',
  motorcycle: 'Motorcycle',
  'maxi-scooter': 'Maxi scooter',
  'low-speed-scooter': 'Low-speed scooter',
} as const;

const motorcycleCategories = new Set([
  'motorcycle',
  'maxi-scooter',
  'low-speed-scooter',
]);

export interface VehicleOptionGroup {
  readonly label: 'Motorcycles' | 'Cars';
  readonly vehicles: readonly VehicleSummary[];
}

export function groupVehicles(
  vehicles: readonly VehicleSummary[],
): readonly VehicleOptionGroup[] {
  const motorcycles = vehicles
    .filter((vehicle) => motorcycleCategories.has(vehicle.vehicleCategory))
    .slice()
    .sort(compareVehicles);
  const cars = vehicles
    .filter((vehicle) => vehicle.vehicleCategory === 'car')
    .slice()
    .sort(compareVehicles);

  return [
    { label: 'Motorcycles', vehicles: motorcycles },
    { label: 'Cars', vehicles: cars },
  ];
}

function compareVehicles(left: VehicleSummary, right: VehicleSummary): number {
  return left.displayName.localeCompare(right.displayName, 'es-ES');
}
