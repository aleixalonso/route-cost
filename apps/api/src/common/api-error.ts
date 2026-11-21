import { z } from 'zod';

export const apiErrorResponseSchema = z.object({
  statusCode: z.number().int(),
  code: z.string().min(1),
  message: z.string().min(1),
  fields: z.array(z.string()),
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export function apiErrorResponse(body: ApiErrorResponse): ApiErrorResponse {
  return apiErrorResponseSchema.parse(body);
}

const frameworkErrors: Record<number, { code: string; message: string }> = {
  400: { code: 'BAD_REQUEST', message: 'The request is invalid.' },
  401: { code: 'UNAUTHORIZED', message: 'Unauthorized.' },
  403: { code: 'FORBIDDEN', message: 'Forbidden.' },
  404: { code: 'NOT_FOUND', message: 'The requested resource does not exist.' },
  405: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' },
  413: { code: 'PAYLOAD_TOO_LARGE', message: 'Payload too large.' },
  415: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Unsupported media type.' },
  429: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
  500: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred.',
  },
  502: { code: 'BAD_GATEWAY', message: 'Bad gateway.' },
  503: { code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable.' },
  504: { code: 'GATEWAY_TIMEOUT', message: 'Gateway timeout.' },
};

export function frameworkApiError(statusCode: number): ApiErrorResponse {
  const detail = frameworkErrors[statusCode] ?? {
    code: 'HTTP_ERROR',
    message: 'The request could not be completed.',
  };
  return apiErrorResponse({ statusCode, ...detail, fields: [] });
}
