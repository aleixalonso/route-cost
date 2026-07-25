import { z } from 'zod';

const pathSchema = z.string().startsWith('/');

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    HOST: z.string().default('0.0.0.0'),
    PORT: z.coerce.number().int().positive().default(3001),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    SWAGGER_ENABLED: z.coerce.boolean().default(true),
    ROUTING_PROVIDER: z.enum(['mock', 'valhalla']).default('mock'),
    VALHALLA_BASE_URL: z
      .string()
      .url()
      .default('https://api-eu.stadiamaps.com'),
    VALHALLA_ROUTE_PATH: pathSchema.default('/route/v1'),
    VALHALLA_TRACE_ATTRIBUTES_PATH: pathSchema.default('/trace_attributes/v1'),
    VALHALLA_API_KEY: z.string().optional().default(''),
    VALHALLA_CLIENT_ID: z.string().min(1).default('route-cost'),
    VALHALLA_REQUEST_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(8_000),
    VALHALLA_MAX_ALTERNATIVES: z.coerce.number().int().min(0).max(2).default(2),
  })
  .superRefine((environment, context) => {
    if (
      environment.ROUTING_PROVIDER === 'valhalla' &&
      environment.VALHALLA_API_KEY.length === 0
    ) {
      context.addIssue({
        code: 'custom',
        message: 'VALHALLA_API_KEY is required when ROUTING_PROVIDER=valhalla.',
        path: ['VALHALLA_API_KEY'],
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(values: NodeJS.ProcessEnv): Environment {
  return environmentSchema.parse(values);
}
