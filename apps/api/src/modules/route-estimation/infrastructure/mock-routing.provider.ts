import { Injectable } from '@nestjs/common';
import type {
  RoutingProvider,
  RoutingRequest,
  RoutingResult,
} from '@route-cost/routing';

@Injectable()
export class MockRoutingProvider implements RoutingProvider {
  public calculateRoutes(request: RoutingRequest): Promise<RoutingResult> {
    return Promise.resolve({
      alternatives: [
        {
          id: 'primary',
          distanceMetres: 12_500,
          durationSeconds: 1320,
          encodedPolyline: 'mock-polyline',
          segments: [
            {
              distanceMetres: 7_500,
              beginShapeIndex: 0,
              endShapeIndex: 12,
              roadCategory: 'urban',
              classificationReason: 'urban-density',
              roadClass: 'primary',
              density: 9,
            },
            {
              distanceMetres: 5_000,
              beginShapeIndex: 13,
              endShapeIndex: 20,
              roadCategory:
                request.vehicleCategory === 'low-speed-scooter'
                  ? 'interurban'
                  : 'motorway',
              classificationReason:
                request.vehicleCategory === 'low-speed-scooter'
                  ? 'interurban-road-class'
                  : 'road-class-motorway',
              roadClass:
                request.vehicleCategory === 'low-speed-scooter'
                  ? 'secondary'
                  : 'motorway',
            },
          ],
        },
      ],
    });
  }
}
