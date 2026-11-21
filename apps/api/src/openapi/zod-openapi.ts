import { applyDecorators } from '@nestjs/common';
import {
  ApiQuery,
  type ReferenceObject,
  type SchemaObject,
} from '@nestjs/swagger';
import { z } from 'zod';

import type { ApiSchemaName } from './api-schemas';

export function toOpenApiSchema(
  schema: z.ZodType,
  direction: 'input' | 'output',
  name = schema.description ?? schema.constructor.name,
): SchemaObject {
  const converted = z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io: direction,
    reused: 'inline',
    unrepresentable: 'any',
  });
  if ('$defs' in converted) {
    throw new Error(`OpenAPI schema "${name}" unexpectedly contains $defs.`);
  }
  const { $schema: _schema, ...openApiSchema } = converted;
  // Zod emits OpenAPI 3.0 vocabulary for this target; its JSON Schema type is broader than Swagger's SchemaObject.
  return openApiSchema as SchemaObject;
}

export function apiSchemaRef(name: ApiSchemaName): ReferenceObject {
  return { $ref: `#/components/schemas/${name}` };
}

export function ApiZodQuery(
  schema: z.ZodType,
  examples: Record<string, unknown> = {},
): MethodDecorator {
  const converted = toOpenApiSchema(schema, 'input');
  const required = new Set(converted.required ?? []);
  return applyDecorators(
    ...Object.entries(converted.properties ?? {}).map(
      ([name, propertySchema]) =>
        ApiQuery({
          name,
          required: required.has(name),
          schema: propertySchema,
          ...(name in examples ? { example: examples[name] } : {}),
        }),
    ),
  );
}
