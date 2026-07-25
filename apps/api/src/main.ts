import 'reflect-metadata';

import { validateEnvironment } from './config/environment';
import { createApp } from './create-app';

async function bootstrap(): Promise<void> {
  const environment = validateEnvironment(process.env);
  const app = await createApp();
  await app.listen(environment.PORT, environment.HOST);
}

bootstrap().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown startup failure';
  process.stderr.write(`RouteCost API failed to start: ${message}\n`);
  process.exitCode = 1;
});
