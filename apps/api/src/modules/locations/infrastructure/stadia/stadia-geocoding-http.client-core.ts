import type { ZodSchema } from 'zod';

import {
  StadiaGeocodingAuthenticationError,
  StadiaGeocodingInvalidResponseError,
  StadiaGeocodingRateLimitError,
  StadiaGeocodingTimeoutError,
  StadiaGeocodingUnavailableError,
  StadiaLocationNotFoundError,
} from './stadia-geocoding.errors';
import {
  stadiaAutocompleteResponseSchema,
  stadiaErrorResponseSchema,
  stadiaFullLocationResponseSchema,
} from './stadia-geocoding.schema';
import type {
  StadiaAutocompleteResponse,
  StadiaFullLocationResponse,
  StadiaGeocodingConfig,
} from './stadia-geocoding.types';

export class StadiaGeocodingHttpClientCore {
  public constructor(private readonly config: StadiaGeocodingConfig) {}

  public autocomplete(url: URL): Promise<StadiaAutocompleteResponse> {
    return this.get(url, stadiaAutocompleteResponseSchema);
  }

  public search(url: URL): Promise<StadiaFullLocationResponse> {
    return this.get(url, stadiaFullLocationResponseSchema);
  }

  public placeDetails(url: URL): Promise<StadiaFullLocationResponse> {
    return this.get(url, stadiaFullLocationResponseSchema, true);
  }

  public reverse(url: URL): Promise<StadiaFullLocationResponse> {
    return this.get(url, stadiaFullLocationResponseSchema);
  }

  private async get<T>(
    url: URL,
    responseSchema: ZodSchema<T>,
    notFoundOn404 = false,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.requestTimeoutMs,
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Stadia-Auth ${this.config.apiKey}`,
          'X-Client-Id': this.config.clientId,
        },
        signal: controller.signal,
      });

      return await this.handleResponse(response, responseSchema, notFoundOn404);
    } catch (error) {
      if (isAbortError(error)) {
        throw new StadiaGeocodingTimeoutError();
      }

      if (isStadiaGeocodingError(error)) {
        throw error;
      }

      throw new StadiaGeocodingUnavailableError();
    } finally {
      clearTimeout(timeout);
    }
  }

  private async handleResponse<T>(
    response: Response,
    responseSchema: ZodSchema<T>,
    notFoundOn404: boolean,
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
        throw new StadiaGeocodingAuthenticationError(options);
      }

      if (response.status === 404 && notFoundOn404) {
        throw new StadiaLocationNotFoundError(options);
      }

      if (response.status === 429) {
        throw new StadiaGeocodingRateLimitError(options);
      }

      if (response.status >= 500 && response.status <= 599) {
        throw new StadiaGeocodingUnavailableError(options);
      }

      throw new StadiaGeocodingInvalidResponseError(options);
    }

    const json = await this.readJson(response);
    const result = responseSchema.safeParse(json);

    if (!result.success) {
      throw new StadiaGeocodingInvalidResponseError({
        status: response.status,
        providerRequestId,
        providerErrorCode: 'schema_mismatch',
      });
    }

    return result.data;
  }

  private async readJson(response: Response): Promise<unknown> {
    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      throw new StadiaGeocodingInvalidResponseError({
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
      const parsed = stadiaErrorResponseSchema.safeParse(json);

      if (!parsed.success) {
        return undefined;
      }

      const nestedCode =
        typeof parsed.data.error === 'object'
          ? parsed.data.error.code
          : parsed.data.error;
      return sanitizeProviderErrorCode(
        nestedCode ?? parsed.data.error_code ?? parsed.data.status_code,
      );
    } catch {
      return undefined;
    }
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function isStadiaGeocodingError(error: unknown): boolean {
  return (
    error instanceof StadiaGeocodingAuthenticationError ||
    error instanceof StadiaGeocodingInvalidResponseError ||
    error instanceof StadiaGeocodingRateLimitError ||
    error instanceof StadiaGeocodingTimeoutError ||
    error instanceof StadiaGeocodingUnavailableError ||
    error instanceof StadiaLocationNotFoundError
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
