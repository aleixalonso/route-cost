import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { McpConfig } from './config.js';
import {
  estimateRouteCostInput,
  estimateRouteCostOutput,
  estimateRouteCostTool,
} from './tools/estimate-route-cost.js';
import { listVehiclesOutput, listVehiclesTool } from './tools/list-vehicles.js';
import {
  suggestFuelPriceInput,
  suggestFuelPriceOutput,
  suggestFuelPriceTool,
} from './tools/suggest-fuel-price.js';

export function createMcpServer({
  config,
  fetchImpl,
}: {
  config: McpConfig;
  fetchImpl: typeof fetch;
}) {
  const server = new McpServer({ name: 'route-cost-mcp', version: '0.1.0' });
  server.registerTool(
    'list_vehicles',
    {
      title: 'List vehicles',
      description:
        'List the vehicle types this server can estimate costs for, with their per-road-category fuel consumption. No API keys or network access required.',
      inputSchema: {},
      outputSchema: listVehiclesOutput,
    },
    listVehiclesTool,
  );
  server.registerTool(
    'suggest_fuel_price',
    {
      title: 'Suggest fuel price',
      description:
        'Suggest a fuel price per litre for a coordinate from the official Spanish Ministry fuel-price dataset (open data, no API key). Returns the median price of nearby stations, the source URL and the date the source reports.',
      inputSchema: suggestFuelPriceInput,
      outputSchema: suggestFuelPriceOutput,
    },
    (args) => suggestFuelPriceTool(args, config, fetchImpl),
  );
  server.registerTool(
    'estimate_route_cost',
    {
      title: 'Estimate route cost',
      description:
        "Estimate what a car trip costs: geocode origin and destination, route with Valhalla, split the distance by road category (urban, interurban, motorway, unknown), multiply each share by the vehicle's consumption and the local fuel price. Requires ROUTING_PROVIDER=valhalla with VALHALLA_API_KEY and GEOCODING_PROVIDER=stadia with STADIA_API_KEY; it refuses to estimate with mock providers instead of returning a fixture.",
      inputSchema: estimateRouteCostInput,
      outputSchema: estimateRouteCostOutput,
    },
    (args) => estimateRouteCostTool(args, config, fetchImpl),
  );
  return server;
}
