import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';

import { type Environment, validateEnvironment } from './environment';
import { buildEnvironment } from './environment.builder';

describe('buildEnvironment', () => {
  it('re-reads the validated environment from ConfigService', () => {
    const validated = validateEnvironment({
      ROUTING_PROVIDER: 'valhalla',
      VALHALLA_API_KEY: 'test-key',
      PORT: '4123',
      SWAGGER_ENABLED: 'false',
    });

    const environment = buildEnvironment(
      new ConfigService<Environment, true>(validated),
    );

    expect(environment).toEqual(validated);
  });

  it('preserves coerced types through ConfigService', () => {
    const validated = validateEnvironment({
      PORT: '8080',
      VALHALLA_REQUEST_TIMEOUT_MS: '9000',
      FUEL_PRICE_RADIUS_STEPS_METRES: '5000,10000',
    });

    const environment = buildEnvironment(
      new ConfigService<Environment, true>(validated),
    );

    expect(environment.PORT).toBe(8080);
    expect(environment.VALHALLA_REQUEST_TIMEOUT_MS).toBe(9_000);
    expect(environment.FUEL_PRICE_RADIUS_STEPS_METRES).toBe('5000,10000');
  });
});
