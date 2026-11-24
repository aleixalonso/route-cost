import type * as FuelPrices from '../index.js';
import { SpainFuelPriceHttpClient } from './spain-fuel-price-http.client.js';
import { normalizeSpainFuelPriceSource } from './spain-fuel-price-normalizer.js';

export interface SpainFuelPriceProviderConfig {
  readonly sourceUrl: string;
  readonly requestTimeoutMs: number;
  readonly fetchImpl?: typeof fetch;
  readonly cacheTtlMs: number;
  readonly staleIfErrorMs: number;
}

export function createSpainFuelPriceProvider(
  config: SpainFuelPriceProviderConfig,
): FuelPrices.CountryFuelPriceProvider {
  return new SpainFuelPriceProvider(
    new SpainFuelPriceHttpClient({
      sourceUrl: config.sourceUrl,
      timeoutMs: config.requestTimeoutMs,
      ...(config.fetchImpl === undefined
        ? {}
        : { fetchImpl: config.fetchImpl }),
    }),
    config,
  );
}

interface SpainFuelPriceSnapshot {
  readonly result: FuelPrices.NearbyFuelPricesResult;
  readonly retrievedAtMs: number;
}

class SpainFuelPriceProvider implements FuelPrices.CountryFuelPriceProvider {
  public readonly countryCode = 'ES';
  private snapshot: SpainFuelPriceSnapshot | undefined;
  private refreshPromise: Promise<SpainFuelPriceSnapshot> | undefined;

  public constructor(
    private readonly httpClient: SpainFuelPriceHttpClient,
    private readonly config: SpainFuelPriceProviderConfig,
  ) {}

  public async getNearbyFuelPrices(
    _request: FuelPrices.NearbyFuelPricesRequest,
  ): Promise<FuelPrices.NearbyFuelPricesResult> {
    const now = Date.now();

    if (
      this.snapshot !== undefined &&
      now - this.snapshot.retrievedAtMs <= this.config.cacheTtlMs
    ) {
      return this.snapshot.result;
    }

    try {
      const snapshot = await this.refresh();

      return snapshot.result;
    } catch (error) {
      if (
        this.snapshot !== undefined &&
        now - this.snapshot.retrievedAtMs <=
          this.config.cacheTtlMs + this.config.staleIfErrorMs
      ) {
        return {
          ...this.snapshot.result,
          isStale: true,
        };
      }

      throw error;
    }
  }

  private refresh(): Promise<SpainFuelPriceSnapshot> {
    if (this.refreshPromise !== undefined) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.refreshSnapshot().finally(() => {
      this.refreshPromise = undefined;
    });

    return this.refreshPromise;
  }

  private async refreshSnapshot(): Promise<SpainFuelPriceSnapshot> {
    const retrievedAt = new Date().toISOString();
    const payload = await this.httpClient.fetchSource();
    const normalized = normalizeSpainFuelPriceSource(payload, retrievedAt);
    const snapshot = {
      result: Object.freeze({
        ...normalized.result,
        stations: Object.freeze([...normalized.result.stations]),
      }),
      retrievedAtMs: Date.parse(retrievedAt),
    };

    this.snapshot = snapshot;

    return snapshot;
  }
}
