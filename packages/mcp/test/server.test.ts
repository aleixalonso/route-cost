import { expect, it } from 'vitest';

import { connect } from './client.js';

it('lists exactly the three described tools with object input schemas', async () => {
  const client = await connect();
  const tools = (await client.listTools()).tools;
  expect(tools.map((tool) => tool.name).sort()).toEqual([
    'estimate_route_cost',
    'list_vehicles',
    'suggest_fuel_price',
  ]);
  for (const tool of tools) {
    expect(tool.description?.length).toBeGreaterThan(0);
    expect(tool.inputSchema.type).toBe('object');
  }
});
