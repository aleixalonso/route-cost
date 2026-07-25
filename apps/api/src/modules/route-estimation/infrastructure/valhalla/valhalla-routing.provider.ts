import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  resolveRoutingProfile,
  type RoutingProvider,
  type RoutingRequest,
  type RoutingResult,
} from '@route-cost/routing';

import { VALHALLA_CONFIG, type ValhallaConfig } from './valhalla.types';
import { ValhallaHttpClient } from './valhalla-http.client';
import {
  getValhallaRouteShapes,
  normalizeValhallaRoutes,
} from './valhalla-normalizer';
import {
  buildValhallaRouteRequest,
  buildValhallaTraceAttributesRequest,
} from './valhalla-request.builder';
import { valhallaRouteResponseSchema } from './valhalla-route.schema';
import { valhallaTraceAttributesResponseSchema } from './valhalla-trace-attributes.schema';

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
    const profile = resolveRoutingProfile(request.vehicleCategory);

    this.logger.log({
      event: 'routing_request_started',
      provider: 'valhalla',
      vehicleCategory: request.vehicleCategory,
      alternativesRequested: request.alternatives ?? 0,
    });

    try {
      const routeResponse = await this.httpClient.post(
        this.config.routePath,
        buildValhallaRouteRequest(request, profile, this.config),
        valhallaRouteResponseSchema,
      );
      const traceResponses = await Promise.all(
        getValhallaRouteShapes(routeResponse).map((shape) =>
          this.httpClient.post(
            this.config.traceAttributesPath,
            buildValhallaTraceAttributesRequest(shape, profile),
            valhallaTraceAttributesResponseSchema,
          ),
        ),
      );
      const result = normalizeValhallaRoutes(routeResponse, traceResponses);

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
