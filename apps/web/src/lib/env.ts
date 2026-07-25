import { z } from 'zod';

const clientEnvironmentSchema = z.object({
  VITE_API_BASE_URL: z.string().url().optional(),
});

export const clientEnvironment = clientEnvironmentSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || undefined,
});
