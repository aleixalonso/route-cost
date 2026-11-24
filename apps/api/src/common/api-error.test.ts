import { describe, expect, it } from 'vitest';

import { apiErrorResponse, frameworkApiError } from './api-error';

describe('API error responses', () => {
  it('returns the complete error contract for a mapped framework status', () => {
    expect(frameworkApiError(404)).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'The requested resource does not exist.',
      fields: [],
    });
  });

  it('uses the generic error for an unmapped framework status', () => {
    expect(frameworkApiError(418)).toEqual({
      statusCode: 418,
      code: 'HTTP_ERROR',
      message: 'The request could not be completed.',
      fields: [],
    });
  });

  it('validates a custom error response before returning it', () => {
    const body = {
      statusCode: 400,
      code: 'INVALID_FIELD',
      message: 'A field is invalid.',
      fields: ['origin'],
    };

    const bodyWithExtraField = { ...body, extra: 'discarded' };

    expect(apiErrorResponse(bodyWithExtraField)).toEqual(body);
    expect(() => apiErrorResponse({ ...body, message: '' })).toThrow();
  });
});
