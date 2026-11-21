import { describe, expect, it } from 'vitest';

import { apiSchemas, buildApiSchemaComponents } from './api-schemas';
import { toOpenApiSchema } from './zod-openapi';

describe('API schema components', () => {
  it('converts every registered contract to a schema', () => {
    for (const schema of Object.values(apiSchemas)) {
      const converted = toOpenApiSchema(schema, 'output');
      expect(
        converted.type || converted.oneOf || converted.properties,
      ).toBeTruthy();
    }
  });

  it('contains every registry name', () => {
    expect(Object.keys(buildApiSchemaComponents()).sort()).toEqual(
      Object.keys(apiSchemas).sort(),
    );
  });

  it('requires the four error envelope fields', () => {
    const error = buildApiSchemaComponents().ErrorResponse;
    expect(error.required?.slice().sort()).toEqual([
      'code',
      'fields',
      'message',
      'statusCode',
    ]);
    expect(error.properties?.fields).toMatchObject({ type: 'array' });
  });

  it('does not mutate schemas between conversions', () => {
    const first = buildApiSchemaComponents();
    expect(buildApiSchemaComponents()).toEqual(first);
    expect(buildApiSchemaComponents().ErrorResponse).not.toBe(
      first.ErrorResponse,
    );
  });
});
