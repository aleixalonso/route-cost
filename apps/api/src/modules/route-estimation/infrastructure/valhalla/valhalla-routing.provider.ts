import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  calculateRouteCharacteristics,
  calculateRoutePreferenceCompliance,
  normalizeRoutePreferences,
  type RouteAlternative,
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
    const preferences = normalizeRoutePreferences(request.preferences);

    this.logger.log({
      event: 'routing_request_started',
      provider: 'valhalla',
      vehicleCategory: request.vehicleCategory,
      avoidTolls: preferences?.avoidTolls ?? false,
      avoidMotorways: preferences?.avoidMotorways ?? false,
      avoidFerries: preferences?.avoidFerries ?? false,
      priority: preferences?.priority ?? 'fastest',
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
        alternatives: result.alternatives.map((alternative) =>
          summarizeAlternativeLogging(alternative),
        ),
        conflictCount: result.alternatives.reduce(
          (total, alternative) =>
            total +
            calculateRoutePreferenceCompliance(
              preferences,
              calculateRouteCharacteristics(alternative.segments),
            ).conflicts.length,
          0,
        ),
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

function summarizeAlternativeLogging(
  alternative: RouteAlternative,
): Record<string, unknown> {
  return {
    id: alternative.id,
    containsTolls: alternative.segments.some(
      (segment) => segment.isToll === true,
    ),
    tollUnknown: alternative.segments.some(
      (segment) => segment.isToll === null,
    ),
    containsMotorways: alternative.segments.some(
      (segment) => segment.roadCategory === 'motorway',
    ),
    containsFerries: alternative.segments.some(
      (segment) => segment.isFerry === true,
    ),
    ferryUnknown: alternative.segments.some(
      (segment) => segment.isFerry === null,
    ),
    traceAttributeCompleteness: {
      segments: alternative.segments.length,
      missingTollAttributes: alternative.segments.filter(
        (segment) => segment.isToll === null,
      ).length,
      missingFerryAttributes: alternative.segments.filter(
        (segment) => segment.isFerry === null,
      ).length,
    },
  };
}
