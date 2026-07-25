import { z } from 'zod';

const vehicleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  fuelType: z.enum(['petrol', 'diesel', 'hybrid']),
  litresPer100Km: z.number().positive(),
  dataQuality: z.literal('estimated - not verified for production'),
});

export type Vehicle = z.infer<typeof vehicleSchema>;

const vehicles = [
  {
    id: 'compact-petrol',
    name: 'Compact petrol car',
    fuelType: 'petrol',
    litresPer100Km: 6.2,
    dataQuality: 'estimated - not verified for production',
  },
  {
    id: 'family-diesel',
    name: 'Family diesel car',
    fuelType: 'diesel',
    litresPer100Km: 5.4,
    dataQuality: 'estimated - not verified for production',
  },
] satisfies Vehicle[];

export function listVehicles(): Vehicle[] {
  return vehicles.map((vehicle) => vehicleSchema.parse(vehicle));
}

export function getVehicleById(id: string): Vehicle | undefined {
  const vehicle = vehicles.find((candidate) => candidate.id === id);
  return vehicle ? vehicleSchema.parse(vehicle) : undefined;
}
