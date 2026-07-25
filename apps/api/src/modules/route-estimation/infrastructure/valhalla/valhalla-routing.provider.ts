import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  type RoutingProvider,
  type RoutingRequest,
  type RoutingResult,
} from '@route-cost/routing';

import { VALHALLA_CONFIG, type ValhallaConfig } from './valhalla.types';
import { ValhallaHttpClient } from './valhalla-http.client';
import { calculateValhallaRoutes } from './valhalla-route-calculator';

@Injectable()
export class ValhallaRoutingProvider implements RoutingProvider {
  private readonly logger = new Logger(ValhallaRoutingProvider.name);

  public constructor(
    private readonly httpClient: ValhallaHttpClient,
    @Inject(VALHALLA_CONFIG)
    private readonly config: ValhallaConfig,
  ) {}

  public async calculateRoutes(
    request: RoutingRequest,
  ): Promise<RoutingResult> {
    const startedAt = Date.now();

    this.logger.log({
      event: 'routing_request_started',
      provider: 'valhalla',
      vehicleCategory: request.vehicleCategory,
      alternativesRequested: request.alternatives ?? 0,
    });

    try {
      const result = await calculateValhallaRoutes(
        request,
        this.config,
        this.httpClient,
      );

      this.logger.log({
        event: 'routing_request_completed',
        provider: 'valhalla',
        alternativesReturned: result.alternatives.length,
        durationMs: Date.now() - startedAt,
      });

      return result;
    } catch (error) {
      this.logger.warn({
        event: 'routing_request_failed',
        provider: 'valhalla',
        durationMs: Date.now() - startedAt,
        errorCategory:
          error instanceof Error ? error.name : 'UnknownRoutingProviderError',
        upstreamStatus:
          error instanceof Error && 'status' in error
            ? error.status
            : undefined,
      });
      throw error;
    }
  }
}
