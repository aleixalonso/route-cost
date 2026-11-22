import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach } from 'vitest';

import { parseConfig } from '../src/config.js';
import { createMcpServer } from '../src/server.js';

const open: Array<{
  client: Client;
  server: ReturnType<typeof createMcpServer>;
}> = [];
afterEach(async () => {
  for (const item of open.splice(0)) {
    await item.client.close();
    await item.server.close();
  }
});

export async function connect(
  env: Record<string, string> = {},
  fetchImpl: typeof fetch = () =>
    Promise.reject(new Error('Network is forbidden in tests.')),
) {
  const server = createMcpServer({ config: parseConfig(env), fetchImpl });
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const [serverTransport, clientTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  open.push({ client, server });
  return client;
}
