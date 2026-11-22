import { listVehicles } from '@route-cost/vehicle-data';
import { z } from 'zod';

const profile = z.object({
  urbanLitresPer100Km: z.number(),
  interurbanLitresPer100Km: z.number(),
  motorwayLitresPer100Km: z.number(),
  unknownLitresPer100Km: z.number(),
});
const vehicle = z.object({
  id: z.string(),
  displayName: z.string(),
  manufacturer: z.string(),
  model: z.string(),
  variant: z.string(),
  vehicleCategory: z.string(),
  fuelType: z.string(),
  powertrainType: z.string(),
  consumptionProfile: profile,
  consumptionData: z.object({ status: z.string(), confidence: z.string() }),
});
export const listVehiclesOutput = {
  vehicles: z.array(vehicle),
  total: z.number(),
};

export function listVehiclesTool() {
  const vehicles = listVehicles().map((item) => ({
    id: item.id,
    displayName: item.displayName,
    manufacturer: item.manufacturer,
    model: item.model,
    variant: item.variant,
    vehicleCategory: item.vehicleCategory,
    fuelType: item.fuelType,
    powertrainType: item.powertrainType,
    consumptionProfile: item.consumptionProfile,
    consumptionData: {
      status: item.consumptionData.status,
      confidence: item.consumptionData.confidence,
    },
  }));
  const structuredContent = { vehicles, total: vehicles.length };
  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(structuredContent) },
    ],
    structuredContent,
  };
}
