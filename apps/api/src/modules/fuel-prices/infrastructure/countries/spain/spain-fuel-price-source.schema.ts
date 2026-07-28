import { z } from 'zod';

export const spainFuelPriceSourceStationSchema = z
  .object({
    IDEESS: z.string(),
    Latitud: z.string(),
    'Longitud (WGS84)': z.string(),
  })
  .passthrough();

export const spainFuelPriceSourceSchema = z.object({
  Fecha: z.string().optional(),
  ListaEESSPrecio: z.array(spainFuelPriceSourceStationSchema),
  ResultadoConsulta: z.string().optional(),
});

export type SpainFuelPriceSource = z.infer<typeof spainFuelPriceSourceSchema>;
export type SpainFuelPriceSourceStation = z.infer<
  typeof spainFuelPriceSourceStationSchema
>;
