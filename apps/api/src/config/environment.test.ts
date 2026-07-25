import { describe, expect, it } from 'vitest';

import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it('provides safe local defaults', () => {
    expect(validateEnvironment({})).toMatchObject({
      NODE_ENV: 'development',
      HOST: '0.0.0.0',
      PORT: 3001,
      ROUTING_PROVIDER: 'mock',
    });
  });

  it('rejects unsupported routing providers', () => {
    expect(() =>
      validateEnvironment({ ROUTING_PROVIDER: 'external' }),
    ).toThrow();
  });
});
