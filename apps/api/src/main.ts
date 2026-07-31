import 'reflect-metadata';

import type { Environment } from './config/environment';
import { ENVIRONMENT } from './config/environment.token';
import { createApp } from './create-app';

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const environment = app.get<Environment>(ENVIRONMENT);
  await app.listen(environment.PORT, environment.HOST);
}

bootstrap().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown startup failure';
  process.stderr.write(`RouteCost API failed to start: ${message}\n`);
  process.exitCode = 1;
});
