export interface CategoryFuelEstimate {
  distanceMetres: number;
  litresPer100Km: number;
  estimatedLitres: number;
}

export interface FuelConsumptionBreakdown {
  urban: CategoryFuelEstimate;
  interurban: CategoryFuelEstimate;
  motorway: CategoryFuelEstimate;
  unknown: CategoryFuelEstimate;
}

export interface FuelConsumptionEstimate {
  breakdown: FuelConsumptionBreakdown;
  totalLitres: number;
}
