import type { ZodSchema } from 'zod';

import {
  ValhallaAuthenticationError,
  ValhallaInvalidResponseError,
  ValhallaRateLimitError,
  ValhallaRouteNotFoundError,
  ValhallaTimeoutError,
  ValhallaUnavailableError,
} from './valhalla.errors.js';
import type { ValhallaConfig } from './valhalla-config.js';
import { valhallaErrorResponseSchema } from './valhalla-route.schema.js';

export interface ValhallaHttpClientConfig extends ValhallaConfig {
  fetchImpl?: typeof fetch;
}

export class ValhallaHttpClient {
  public constructor(private readonly config: ValhallaHttpClientConfig) {}

  public post<T>(
    path: string,
    body: unknown,
    responseSchema: ZodSchema<T>,
  ): Promise<T> {
    return this.request(path, body, responseSchema);
  }

  protected handleDebugResponse(
    _path: string,
    _response: unknown,
  ): Promise<void> | void {
    return undefined;
  }

  private async request<T>(
    path: string,
    body: unknown,
    responseSchema: ZodSchema<T>,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.requestTimeoutMs,
    );

    try {
      const response = await (this.config.fetchImpl ?? globalThis.fetch)(
        this.buildUrl(path),
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Stadia-Auth ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'X-Client-Id': this.config.clientId,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );

      return await this.handleResponse(path, response, responseSchema);
    } catch (error) {
      if (isAbortError(error)) {
        throw new ValhallaTimeoutError();
      }

      if (isValhallaError(error)) {
        throw error;
      }

      throw new ValhallaUnavailableError();
    } finally {
      clearTimeout(timeout);
    }
  }

  private async handleResponse<T>(
    path: string,
    response: Response,
    responseSchema: ZodSchema<T>,
  ): Promise<T> {
    const providerRequestId = response.headers.get('x-request-id') ?? undefined;

    if (!response.ok) {
      const providerErrorCode = await this.readProviderErrorCode(response);
      const options = {
        status: response.status,
        providerRequestId,
        providerErrorCode,
      };

      if (response.status === 401 || response.status === 403) {
        throw new ValhallaAuthenticationError(options);
      }

      if (
        response.status === 404 ||
        providerErrorCode?.toLowerCase().includes('no_route') === true
      ) {
        throw new ValhallaRouteNotFoundError(options);
      }

      if (response.status === 429) {
        throw new ValhallaRateLimitError(options);
      }

      if (response.status >= 500 && response.status <= 599) {
        throw new ValhallaUnavailableError(options);
      }

      throw new ValhallaInvalidResponseError(options);
    }

    const json = await this.readJson(response);
    await this.handleDebugResponse(path, json);
    const result = responseSchema.safeParse(json);

    if (!result.success) {
      throw new ValhallaInvalidResponseError({
        status: response.status,
        providerRequestId,
        providerErrorCode: 'schema_mismatch',
      });
    }

    return result.data;
  }

  private buildUrl(path: string): URL {
    const url = new URL(path, this.config.baseUrl);

    if (url.origin !== new URL(this.config.baseUrl).origin) {
      throw new ValhallaInvalidResponseError({
        providerErrorCode: 'invalid_provider_url',
      });
    }

    return url;
  }

  private async readJson(response: Response): Promise<unknown> {
    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      throw new ValhallaInvalidResponseError({
        status: response.status,
        providerRequestId: response.headers.get('x-request-id') ?? undefined,
        providerErrorCode: 'invalid_json',
      });
    }
  }

  private async readProviderErrorCode(
    response: Response,
  ): Promise<string | undefined> {
    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('application/json')) {
      return undefined;
    }

    try {
      const json = await response.clone().json();
      const parsed = valhallaErrorResponseSchema.safeParse(json);

      if (!parsed.success) {
        return undefined;
      }

      const code = parsed.data.error_code ?? parsed.data.status_code;
      return sanitizeProviderErrorCode(code);
    } catch {
      return undefined;
    }
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function isValhallaError(error: unknown): boolean {
  return (
    error instanceof ValhallaAuthenticationError ||
    error instanceof ValhallaInvalidResponseError ||
    error instanceof ValhallaRateLimitError ||
    error instanceof ValhallaRouteNotFoundError ||
    error instanceof ValhallaTimeoutError ||
    error instanceof ValhallaUnavailableError
  );
}

function sanitizeProviderErrorCode(
  code: string | number | undefined,
): string | undefined {
  if (code === undefined) {
    return undefined;
  }

  const value = String(code);
  return /^[\w-]{1,64}$/.test(value) ? value : undefined;
}
