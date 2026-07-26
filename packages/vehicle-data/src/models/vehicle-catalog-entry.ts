import type { ConsumptionProfile } from './consumption-profile.js';
import type { ConsumptionDataMetadata } from './vehicle-data-source.js';
import type { VehicleFuelType } from './vehicle-fuel-type.js';
import type { VehiclePowertrainType } from './vehicle-powertrain-type.js';
import type { VehicleRoutingCategory } from './vehicle-routing-category.js';

export interface VehicleCatalogEntry {
  readonly id: string;
  readonly manufacturer: string;
  readonly model: string;
  readonly variant: string;
  readonly displayName: string;
  readonly yearFrom: number;
  readonly yearTo?: number;
  readonly vehicleCategory: VehicleRoutingCategory;
  readonly fuelType: VehicleFuelType;
  readonly powertrainType: VehiclePowertrainType;
  readonly engineDisplacementCc?: number;
  readonly consumptionProfile: Readonly<ConsumptionProfile>;
  readonly consumptionData: ConsumptionDataMetadata;
}
