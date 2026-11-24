import {
  calculateFuelCost,
  estimateRouteFuelConsumption,
} from '@route-cost/domain';
import {
  RoutingProviderEndpointNotEntitledError,
  summarizeRouteDistances,
} from '@route-cost/routing';
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

export function refusalMessage(config: McpConfig): string | undefined {
  const problems: string[] = [];
  if (config.ROUTING_PROVIDER !== 'valhalla')
    problems.push(
      `ROUTING_PROVIDER is "${config.ROUTING_PROVIDER}" instead of "valhalla".`,
    );
  if (config.VALHALLA_API_KEY.trim() === '')
    problems.push('VALHALLA_API_KEY is missing or empty.');
  if (config.GEOCODING_PROVIDER !== 'stadia')
    problems.push(
      `GEOCODING_PROVIDER is "${config.GEOCODING_PROVIDER}" instead of "stadia".`,
    );
  if (config.STADIA_GEOCODING_API_KEY.trim() === '')
    problems.push(
      'STADIA_GEOCODING_API_KEY is missing or empty (STADIA_API_KEY is accepted as an alias).',
    );
  if (problems.length === 0) return undefined;
  return `This server refuses to estimate without real routing and geocoding providers because a mock route would be a plausible-looking lie. ${problems.join(' ')} Set the settings named above in the server environment and restart the server. Keys are never accepted as tool arguments.`;
}

export async function estimateRouteCostTool(
  args: Args,
  config: McpConfig,
  fetchImpl: typeof fetch,
) {
  const refusal = refusalMessage(config);
  if (refusal !== undefined) return toolError(new Error(refusal));
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
    if (error instanceof RoutingProviderEndpointNotEntitledError)
      return toolError(
        new Error(
          'The road-type breakdown needs a Stadia Maps plan that includes the trace_attributes endpoint. The API key is valid, but this account cannot call trace_attributes, so route-cost cannot produce a real estimate. Check the Stadia Maps plan for this key and use a key whose plan includes trace_attributes, then retry.',
        ),
      );
    return toolError(error);
  }
}
