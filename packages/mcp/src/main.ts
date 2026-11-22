import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { parseConfig } from './config.js';
import { createMcpServer } from './server.js';

try {
  const config = parseConfig();
  const server = createMcpServer({ config, fetchImpl: fetch });
  await server.connect(new StdioServerTransport());
} catch {
  process.stderr.write(
    'route-cost-mcp failed to start. Check server configuration.\n',
  );
  process.exitCode = 1;
}
