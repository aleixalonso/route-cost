import type { z } from 'zod';

import { clientEnvironment } from '../../lib/env';
import { type ApiError, ApiRequestError } from './api-error';

interface ApiRequestOptions<TSchema extends z.ZodType> {
  readonly path: string;
  readonly method?: 'GET' | 'POST';
  readonly query?: URLSearchParams | undefined;
  readonly body?: unknown;
  readonly schema: TSchema;
  readonly signal?: AbortSignal | undefined;
}

export async function apiRequest<TSchema extends z.ZodType>(
  options: ApiRequestOptions<TSchema>,
): Promise<z.infer<TSchema>> {
  const baseUrl = clientEnvironment.VITE_API_BASE_URL ?? '';
  const query = options.query?.toString();
  const url = `${baseUrl}/api/v1${options.path}${query ? `?${query}` : ''}`;
  const init: RequestInit = {
    method: options.method ?? 'GET',
    ...(options.signal === undefined ? {} : { signal: options.signal }),
    ...(options.body === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options.body),
        }),
  };
  const response = await fetch(url, init);

  const payload: unknown = await parseJson(response);

  if (!response.ok) {
    throw new ApiRequestError(toResponseError(response, payload));
  }

  return options.schema.parse(payload);
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text.length === 0) {
    return null;
  }

  return JSON.parse(text) as unknown;
}

function toResponseError(response: Response, payload: unknown): ApiError {
  const backendError = readBackendError(payload);

  return {
    status: response.status,
    ...(backendError.code === undefined ? {} : { code: backendError.code }),
    message: backendError.message ?? response.statusText,
  };
}

function readBackendError(payload: unknown): {
  readonly code?: string;
  readonly message?: string;
} {
  if (typeof payload !== 'object' || payload === null) {
    return {};
  }

  const code =
    'code' in payload && typeof payload.code === 'string'
      ? payload.code
      : undefined;
  const message =
    'message' in payload && typeof payload.message === 'string'
      ? payload.message
      : undefined;

  return {
    ...(code === undefined ? {} : { code }),
    ...(message === undefined ? {} : { message }),
  };
}
