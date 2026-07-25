import { Injectable } from '@nestjs/common';
import type {
  RoutingProvider,
  RoutingRequest,
  RoutingResult,
} from '@route-cost/routing';

@Injectable()
export class MockRoutingProvider implements RoutingProvider {
  public calculateRoutes(_request: RoutingRequest): Promise<RoutingResult> {
    return Promise.resolve({
      alternatives: [
        {
          id: 'mock-primary',
          distanceKm: 12.5,
          durationSeconds: 1320,
          segments: [
            {
              distanceKm: 7.5,
              durationSeconds: 720,
              roadCategory: 'urban',
            },
            {
              distanceKm: 5,
              durationSeconds: 600,
              roadCategory: 'primary',
            },
          ],
        },
      ],
    });
  }
}
