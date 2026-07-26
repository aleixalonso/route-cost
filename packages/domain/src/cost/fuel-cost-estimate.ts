import type { FuelPrice } from './fuel-price.js';

export interface FuelCostEstimate {
  fuelPrice: FuelPrice;
  estimatedCost: number;
}
