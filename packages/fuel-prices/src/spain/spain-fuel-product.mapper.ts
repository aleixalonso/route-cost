import type { FuelProduct } from '../index.js';

export const spainFuelProductFields = {
  'petrol-95-e5': 'Precio Gasolina 95 E5',
  'diesel-a': 'Precio Gasoleo A',
} as const satisfies Record<FuelProduct, string>;

export function getSpainPriceField(fuelProduct: FuelProduct): string {
  return spainFuelProductFields[fuelProduct];
}
