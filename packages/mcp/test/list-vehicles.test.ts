import { expect, it } from 'vitest';

import { connect } from './client.js';

it('lists six vehicles with usable consumption', async () => {
  const client = await connect();
  const result = await client.callTool({
    name: 'list_vehicles',
    arguments: {},
  });
  expect(result.isError).not.toBe(true);
  expect(result.structuredContent).toMatchObject({ total: 6 });
  expect(JSON.stringify(result.structuredContent)).toContain(
    'urbanLitresPer100Km',
  );
});
