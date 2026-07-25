import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  SWAGGER_ENABLED: z.coerce.boolean().default(true),
  ROUTING_PROVIDER: z.literal('mock').default('mock'),
  ROUTING_PROVIDER_API_KEY: z.string().optional().default(''),
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(values: NodeJS.ProcessEnv): Environment {
  return environmentSchema.parse(values);
}
