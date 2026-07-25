import { z } from 'zod';

export const healthStatusSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('route-cost-api'),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;
