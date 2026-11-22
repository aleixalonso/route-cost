import {
  calculateFuelCost,
  estimateRouteFuelConsumption,
} from '@route-cost/domain';
import { summarizeRouteDistances } from '@route-cost/routing';
import { getVehicleById } from '@route-cost/vehicle-data';
import { z } from 'zod';

import type { McpConfig } from '../config.js';
import { toolError } from '../errors.js';
import {
  createGeocodingProvider,
  createRoutingProvider,
} from '../providers.js';
import { suggestSpainFuelPrice } from './suggest-fuel-price.js';

export const estimateRouteCostInput = {
  origin: z.string().min(1),
  destination: z.string().min(1),
  vehicleId: z.string().min(1),
  fuelPrice: z
    .object({
      amountPerLitre: z.number().positive().max(10),
      currency: z
        .string()
        .regex(/^[A-Z]{3}$/)
        .default('EUR'),
    })
    .optional(),
};
const category = z.object({ distanceKm: z.number(), litres: z.number() });
const source = z.object({
  kind: z.enum(['fuel-price', 'routing', 'geocoding']),
  label: z.string(),
  url: z.string().optional(),
  updatedAt: z.string().optional(),
  retrievedAt: z.string().optional(),
});
export const estimateRouteCostOutput = {
  distanceKm: z.number(),
  litres: z.number(),
  costPerLitre: z.number(),
  currency: z.string(),
  estimatedCost: z.number(),
  breakdownByRoadCategory: z.object({
    urban: category,
    interurban: category,
    motorway: category,
    unknown: category,
  }),
  vehicle: z.object({
    id: z.string(),
    displayName: z.string(),
    vehicleCategory: z.string(),
  }),
  origin: z.object({
    query: z.string(),
    label: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  destination: z.object({
    query: z.string(),
    label: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  sources: z.array(source),
};

type Args = {
  origin: string;
  destination: string;
  vehicleId: string;
  fuelPrice?: { amountPerLitre: number; currency: string } | undefined;
};

export async function estimateRouteCostTool(
  args: Args,
  config: McpConfig,
  fetchImpl: typeof fetch,
) {
  if (
    config.ROUTING_PROVIDER !== 'valhalla' ||
    config.VALHALLA_API_KEY.trim() === '' ||
    config.GEOCODING_PROVIDER !== 'stadia' ||
    config.STADIA_API_KEY.trim() === ''
  ) {
    return toolError(
      new Error(
        `This server refuses to estimate without real routing and geocoding providers because a mock route would be a plausible-looking lie. Required settings are ROUTING_PROVIDER=valhalla with VALHALLA_API_KEY and GEOCODING_PROVIDER=stadia with STADIA_API_KEY. Current settings are ROUTING_PROVIDER=${config.ROUTING_PROVIDER} and GEOCODING_PROVIDER=${config.GEOCODING_PROVIDER}. Keys are read from the server environment and are never accepted as tool arguments.`,
      ),
    );
  }
  try {
    const vehicle = getVehicleById(args.vehicleId);
    if (vehicle === undefined)
      throw new Error(
        `Unknown vehicleId: ${args.vehicleId}. Call list_vehicles for the valid ids.`,
      );
    const geocoding = createGeocodingProvider(config, fetchImpl);
    const originItem = (
      await geocoding.searchLocations({
        query: args.origin,
        limit: 1,
        language: 'es',
      })
    ).items[0];
    if (originItem === undefined)
      throw new Error(`Stadia geocoding could not resolve "${args.origin}".`);
    const destinationItem = (
      await geocoding.searchLocations({
        query: args.destination,
        limit: 1,
        language: 'es',
      })
    ).items[0];
    if (destinationItem === undefined)
      throw new Error(
        `Stadia geocoding could not resolve "${args.destination}".`,
      );
    const origin = {
      label: originItem.label,
      latitude: originItem.coordinate.latitude,
      longitude: originItem.coordinate.longitude,
    };
    const destination = {
      label: destinationItem.label,
      latitude: destinationItem.coordinate.latitude,
      longitude: destinationItem.coordinate.longitude,
    };
    const routed = await createRoutingProvider(
      config,
      fetchImpl,
    ).calculateRoutes({
      origin: originItem.coordinate,
      destination: destinationItem.coordinate,
      vehicleCategory: vehicle.vehicleCategory,
      alternatives: 0,
    });
    const alternative = routed.alternatives[0];
    if (alternative === undefined)
      throw new Error('Valhalla returned no route alternatives.');
    const distanceKm =
      alternative.segments.reduce(
        (total, segment) => total + segment.distanceMetres,
        0,
      ) / 1000;
    const hasToll = alternative.segments.some(
      (segment) => segment.isToll === true,
    );
    const hasFerry = alternative.segments.some(
      (segment) => segment.isFerry === true,
    );
    const distances = summarizeRouteDistances(alternative.segments);
    const consumption = estimateRouteFuelConsumption(
      distances,
      vehicle.consumptionProfile,
    );
    let price = args.fuelPrice;
    let suggestion;
    if (price === undefined) {
      const fuelProduct =
        vehicle.fuelType === 'diesel' ? 'diesel-a' : 'petrol-95-e5';
      suggestion = await suggestSpainFuelPrice(
        origin,
        fuelProduct,
        config,
        fetchImpl,
      );
      price = {
        amountPerLitre: suggestion.pricePerLitre,
        currency: suggestion.currency,
      };
    }
    const cost = calculateFuelCost(consumption.totalLitres, price);
    const breakdownByRoadCategory = {
      urban: {
        distanceKm: distances.urbanDistanceMetres / 1000,
        litres: consumption.breakdown.urban.estimatedLitres,
      },
      interurban: {
        distanceKm: distances.interurbanDistanceMetres / 1000,
        litres: consumption.breakdown.interurban.estimatedLitres,
      },
      motorway: {
        distanceKm: distances.motorwayDistanceMetres / 1000,
        litres: consumption.breakdown.motorway.estimatedLitres,
      },
      unknown: {
        distanceKm: distances.unknownDistanceMetres / 1000,
        litres: consumption.breakdown.unknown.estimatedLitres,
      },
    };
    const fuelSource =
      suggestion === undefined
        ? { kind: 'fuel-price' as const, label: 'Caller-supplied fuel price' }
        : {
            kind: 'fuel-price' as const,
            label: 'Spanish Ministry nearby median fuel price',
            url: suggestion.sourceUrl,
            ...(suggestion.sourceUpdatedAt === undefined
              ? {}
              : { updatedAt: suggestion.sourceUpdatedAt }),
            retrievedAt: suggestion.retrievedAt,
          };
    const structuredContent = {
      distanceKm,
      litres: consumption.totalLitres,
      costPerLitre: price.amountPerLitre,
      currency: price.currency,
      estimatedCost: cost.estimatedCost,
      breakdownByRoadCategory,
      vehicle: {
        id: vehicle.id,
        displayName: vehicle.displayName,
        vehicleCategory: vehicle.vehicleCategory,
      },
      origin: { query: args.origin, ...origin },
      destination: { query: args.destination, ...destination },
      sources: [
        {
          kind: 'routing' as const,
          label: 'Valhalla',
          url: new URL(
            config.VALHALLA_ROUTE_PATH,
            config.VALHALLA_BASE_URL,
          ).toString(),
        },
        {
          kind: 'geocoding' as const,
          label: 'Stadia Maps',
          url: new URL(
            config.STADIA_GEOCODING_SEARCH_PATH,
            config.STADIA_GEOCODING_BASE_URL,
          ).toString(),
        },
        fuelSource,
      ],
    };
    const split = Object.entries(breakdownByRoadCategory)
      .map(
        ([name, item]) =>
          `${name}: ${item.distanceKm.toFixed(2)} km, ${item.litres.toFixed(2)} L`,
      )
      .join('; ');
    const text = `${origin.label} to ${destination.label}: ${distanceKm.toFixed(2)} km, ${consumption.totalLitres.toFixed(2)} L at ${price.amountPerLitre.toFixed(2)} ${price.currency}/L (${fuelSource.label}${suggestion?.sourceUpdatedAt === undefined ? '' : `, ${suggestion.sourceUpdatedAt}`}), total ${cost.estimatedCost.toFixed(2)} ${price.currency}. ${split}. Toll road: ${hasToll ? 'yes' : 'no'}; ferry: ${hasFerry ? 'yes' : 'no'}.`;
    return { content: [{ type: 'text' as const, text }], structuredContent };
  } catch (error) {
    return toolError(error);
  }
}
