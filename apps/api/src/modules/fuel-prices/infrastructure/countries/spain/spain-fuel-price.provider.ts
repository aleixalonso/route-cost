import type {
  CountryFuelPriceProvider,
  NearbyFuelPricesRequest,
  NearbyFuelPricesResult,
} from '@route-cost/fuel-prices';

import { SpainFuelPriceHttpClient } from './spain-fuel-price-http.client';
import { normalizeSpainFuelPriceSource } from './spain-fuel-price-normalizer';

export interface SpainFuelPriceProviderConfig {
  readonly cacheTtlMs: number;
  readonly staleIfErrorMs: number;
}

export const SPAIN_FUEL_PRICE_PROVIDER_CONFIG = Symbol(
  'SPAIN_FUEL_PRICE_PROVIDER_CONFIG',
);

interface SpainFuelPriceSnapshot {
  readonly result: NearbyFuelPricesResult;
  readonly retrievedAtMs: number;
}

export class SpainFuelPriceProvider implements CountryFuelPriceProvider {
  public readonly countryCode = 'ES';
  private snapshot: SpainFuelPriceSnapshot | undefined;
  private refreshPromise: Promise<SpainFuelPriceSnapshot> | undefined;

  public constructor(
    private readonly httpClient: SpainFuelPriceHttpClient,
    private readonly config: SpainFuelPriceProviderConfig,
  ) {}

  public async getNearbyFuelPrices(
    _request: NearbyFuelPricesRequest,
  ): Promise<NearbyFuelPricesResult> {
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
