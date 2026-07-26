import type { z } from 'zod';

import forza from '../../data/vehicles/honda-forza-350-2025.json' with { type: 'json' };
import nx500 from '../../data/vehicles/honda-nx500-2025.json' with { type: 'json' };
import corolla from '../../data/vehicles/toyota-corolla-1-8-hybrid-2025.json' with { type: 'json' };
import golfTsi from '../../data/vehicles/volkswagen-golf-1-5-tsi-2025.json' with { type: 'json' };
import golfTdi from '../../data/vehicles/volkswagen-golf-2-0-tdi-2025.json' with { type: 'json' };
import xmax from '../../data/vehicles/yamaha-xmax-300-2025.json' with { type: 'json' };
import type { VehicleCatalogEntry } from '../models/vehicle-catalog-entry.js';
import type { ConsumptionDataMetadata } from '../models/vehicle-data-source.js';
import { vehicleCatalogSchema } from '../schemas/vehicle-catalog.schema.js';
import type { vehicleCatalogEntrySchema } from '../schemas/vehicle-catalog-entry.schema.js';

const parsedCatalog = vehicleCatalogSchema
  .parse([forza, xmax, nx500, golfTsi, golfTdi, corolla])
  .map(toCatalogEntry);

export const vehicleCatalog: readonly VehicleCatalogEntry[] =
  deepFreeze(parsedCatalog);

export function cloneVehicle(
  vehicle: VehicleCatalogEntry,
): VehicleCatalogEntry {
  return structuredClone(vehicle);
}

function deepFreeze<T extends object>(value: T): Readonly<T> {
  Object.freeze(value);

  for (const child of Object.values(value)) {
    if (
      child !== null &&
      typeof child === 'object' &&
      !Object.isFrozen(child)
    ) {
      deepFreeze(child);
    }
  }

  return value;
}

type ParsedVehicleCatalogEntry = z.infer<typeof vehicleCatalogEntrySchema>;

function toCatalogEntry(
  vehicle: ParsedVehicleCatalogEntry,
): VehicleCatalogEntry {
  return {
    id: vehicle.id,
    manufacturer: vehicle.manufacturer,
    model: vehicle.model,
    variant: vehicle.variant,
    displayName: vehicle.displayName,
    yearFrom: vehicle.yearFrom,
    ...(vehicle.yearTo === undefined ? {} : { yearTo: vehicle.yearTo }),
    vehicleCategory: vehicle.vehicleCategory,
    fuelType: vehicle.fuelType,
    powertrainType: vehicle.powertrainType,
    ...(vehicle.engineDisplacementCc === undefined
      ? {}
      : { engineDisplacementCc: vehicle.engineDisplacementCc }),
    consumptionProfile: vehicle.consumptionProfile,
    consumptionData: toConsumptionData(vehicle.consumptionData),
  };
}

function toConsumptionData(
  consumptionData: ParsedVehicleCatalogEntry['consumptionData'],
): ConsumptionDataMetadata {
  return {
    status: consumptionData.status,
    confidence: consumptionData.confidence,
    ...(consumptionData.officialCombinedLitresPer100Km === undefined
      ? {}
      : {
          officialCombinedLitresPer100Km:
            consumptionData.officialCombinedLitresPer100Km,
        }),
    methodology: consumptionData.methodology,
    sources: consumptionData.sources.map((source) => ({
      type: source.type,
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      accessedAt: source.accessedAt,
      ...(source.notes === undefined ? {} : { notes: source.notes }),
    })),
  };
}
