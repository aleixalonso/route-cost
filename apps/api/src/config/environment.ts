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
    GEOCODING_PROVIDER: z.enum(['mock', 'stadia']).default('mock'),
    STADIA_GEOCODING_BASE_URL: z
      .string()
      .url()
      .default('https://api-eu.stadiamaps.com'),
    STADIA_GEOCODING_AUTOCOMPLETE_PATH: pathSchema.default(
      '/geocoding/v2/autocomplete',
    ),
    STADIA_GEOCODING_SEARCH_PATH: pathSchema.default('/geocoding/v2/search'),
    STADIA_GEOCODING_PLACE_DETAILS_PATH: pathSchema.default(
      '/geocoding/v2/place_details',
    ),
    STADIA_GEOCODING_REVERSE_PATH: pathSchema.default('/geocoding/v2/reverse'),
    STADIA_GEOCODING_API_KEY: z.string().optional().default(''),
    STADIA_GEOCODING_CLIENT_ID: z.string().min(1).default('route-cost'),
    STADIA_GEOCODING_REQUEST_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(5_000),
    STADIA_GEOCODING_DEFAULT_LIMIT: z.coerce.number().int().min(1).default(5),
    STADIA_GEOCODING_MAX_LIMIT: z.coerce
      .number()
      .int()
      .min(1)
      .max(10)
      .default(10),
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

    if (
      environment.GEOCODING_PROVIDER === 'stadia' &&
      environment.STADIA_GEOCODING_API_KEY.length === 0
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'STADIA_GEOCODING_API_KEY is required when GEOCODING_PROVIDER=stadia.',
        path: ['STADIA_GEOCODING_API_KEY'],
      });
    }

    if (
      environment.STADIA_GEOCODING_DEFAULT_LIMIT >
      environment.STADIA_GEOCODING_MAX_LIMIT
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'STADIA_GEOCODING_DEFAULT_LIMIT must not exceed STADIA_GEOCODING_MAX_LIMIT.',
        path: ['STADIA_GEOCODING_DEFAULT_LIMIT'],
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(values: NodeJS.ProcessEnv): Environment {
  return environmentSchema.parse(values);
}
