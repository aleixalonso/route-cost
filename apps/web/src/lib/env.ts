import { z } from 'zod';

const clientEnvironmentSchema = z.object({
  VITE_API_BASE_URL: z.string().url().optional(),
  VITE_MAP_STYLE_URL: z.string().min(1).default('/map-style.json'),
});

export const clientEnvironment = clientEnvironmentSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || undefined,
  VITE_MAP_STYLE_URL: import.meta.env.VITE_MAP_STYLE_URL || undefined,
});
