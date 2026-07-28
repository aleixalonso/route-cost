import {
  SpainFuelPriceInvalidResponseError,
  SpainFuelPriceTimeoutError,
  SpainFuelPriceUnavailableError,
} from './spain-fuel-price.errors';

export interface SpainFuelPriceHttpClientConfig {
  readonly sourceUrl: string;
  readonly timeoutMs: number;
}

export const SPAIN_FUEL_PRICE_HTTP_CLIENT_CONFIG = Symbol(
  'SPAIN_FUEL_PRICE_HTTP_CLIENT_CONFIG',
);

export class SpainFuelPriceHttpClient {
  public constructor(private readonly config: SpainFuelPriceHttpClientConfig) {}

  public async fetchSource(): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(this.config.sourceUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new SpainFuelPriceUnavailableError();
      }

      const contentType = response.headers.get('content-type') ?? '';

      if (
        contentType.length > 0 &&
        !contentType.includes('json') &&
        !contentType.includes('text/html')
      ) {
        throw new SpainFuelPriceInvalidResponseError();
      }

      try {
        return await response.json();
      } catch {
        throw new SpainFuelPriceInvalidResponseError();
      }
    } catch (error) {
      if (error instanceof SpainFuelPriceUnavailableError) {
        throw error;
      }

      if (error instanceof SpainFuelPriceInvalidResponseError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new SpainFuelPriceTimeoutError();
      }

      throw new SpainFuelPriceUnavailableError();
    } finally {
      clearTimeout(timeout);
    }
  }
}
