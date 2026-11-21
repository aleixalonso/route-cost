import type { SchemaObject } from '@nestjs/swagger';
import {
  autocompleteLocationsResponseSchema,
  estimateRouteCostRequestSchema,
  estimateRouteCostResponseSchema,
  estimateRouteRequestSchema,
  estimateRouteResponseSchema,
  fuelPriceSuggestionRequestSchema,
  fuelPriceSuggestionResponseSchema,
  healthStatusSchema,
  locationDetailsResponseSchema,
  reverseGeocodeResponseSchema,
  searchLocationsResponseSchema,
  vehicleDetailResponseSchema,
  vehicleListResponseSchema,
} from '@route-cost/contracts';

import { apiErrorResponseSchema } from '../common/api-error';
import { toOpenApiSchema } from './zod-openapi';

export const apiSchemas = {
  AutocompleteLocationsResponse: autocompleteLocationsResponseSchema,
  SearchLocationsResponse: searchLocationsResponseSchema,
  LocationDetailsResponse: locationDetailsResponseSchema,
  ReverseGeocodeResponse: reverseGeocodeResponseSchema,
  EstimateRouteRequest: estimateRouteRequestSchema,
  EstimateRouteResponse: estimateRouteResponseSchema,
  EstimateRouteCostRequest: estimateRouteCostRequestSchema,
  EstimateRouteCostResponse: estimateRouteCostResponseSchema,
  FuelPriceSuggestionRequest: fuelPriceSuggestionRequestSchema,
  FuelPriceSuggestionResponse: fuelPriceSuggestionResponseSchema,
  VehicleListResponse: vehicleListResponseSchema,
  VehicleDetailResponse: vehicleDetailResponseSchema,
  HealthStatus: healthStatusSchema,
  ErrorResponse: apiErrorResponseSchema,
};

export type ApiSchemaName = keyof typeof apiSchemas;

const schemaDirections: Partial<Record<ApiSchemaName, 'input' | 'output'>> = {
  EstimateRouteRequest: 'input',
  EstimateRouteCostRequest: 'input',
  FuelPriceSuggestionRequest: 'input',
};

function isApiSchemaName(name: string): name is ApiSchemaName {
  return Object.hasOwn(apiSchemas, name);
}

function hasAllComponents(
  components: Partial<Record<ApiSchemaName, SchemaObject>>,
): components is Record<ApiSchemaName, SchemaObject> {
  return Object.keys(apiSchemas)
    .filter(isApiSchemaName)
    .every((name) => components[name] !== undefined);
}

export function buildApiSchemaComponents(): Record<
  ApiSchemaName,
  SchemaObject
> {
  const components: Partial<Record<ApiSchemaName, SchemaObject>> = {};
  for (const name of Object.keys(apiSchemas).filter(isApiSchemaName)) {
    components[name] = toOpenApiSchema(
      apiSchemas[name],
      schemaDirections[name] ?? 'output',
      name,
    );
  }
  if (!hasAllComponents(components)) {
    throw new Error('OpenAPI schema components are incomplete.');
  }
  return components;
}
