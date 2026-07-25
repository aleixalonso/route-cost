import { type HealthStatus, healthStatusSchema } from '@route-cost/contracts';

import { clientEnvironment } from '../../lib/env';

export async function fetchReadyHealth(): Promise<HealthStatus> {
  const baseUrl = clientEnvironment.VITE_API_BASE_URL ?? '';
  const response = await fetch(`${baseUrl}/api/v1/health/ready`);

  if (!response.ok) {
    throw new Error('Health request failed');
  }

  return healthStatusSchema.parse(await response.json());
}
