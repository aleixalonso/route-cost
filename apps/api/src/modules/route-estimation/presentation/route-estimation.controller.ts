import { Body, Controller, Post, UsePipes, Version } from '@nestjs/common';
import type {
  EstimateRouteRequest,
  EstimateRouteResponse,
} from '@route-cost/contracts';
import { estimateRouteRequestSchema } from '@route-cost/contracts';

import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { EstimateRouteService } from '../application/estimate-route.service';

@Controller('route-estimates')
export class RouteEstimationController {
  public constructor(
    private readonly estimateRouteService: EstimateRouteService,
  ) {}

  @Post()
  @Version('1')
  @UsePipes(new ZodValidationPipe(estimateRouteRequestSchema))
  public estimate(
    @Body() request: EstimateRouteRequest,
  ): Promise<EstimateRouteResponse> {
    return this.estimateRouteService.estimate(request);
  }
}
