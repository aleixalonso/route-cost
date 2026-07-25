import { describe, expect, it } from 'vitest';

import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns the public service status', () => {
    expect(new HealthService().getStatus()).toEqual({
      status: 'ok',
      service: 'route-cost-api',
    });
  });
});
