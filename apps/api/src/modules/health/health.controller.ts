import { Controller, Get, Version } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { HealthStatus } from '@route-cost/contracts';

import { apiSchemaRef } from '../../openapi/zod-openapi';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  public constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @Version('1')
  @ApiTooManyRequestsResponse({
    description: 'Rate limited.',
    schema: apiSchemaRef('ErrorResponse'),
  })
  @ApiOkResponse({
    schema: apiSchemaRef('HealthStatus'),
    description: 'The API process is alive.',
  })
  public live(): HealthStatus {
    return this.healthService.getStatus();
  }

  @Get('ready')
  @Version('1')
  @ApiTooManyRequestsResponse({
    description: 'Rate limited.',
    schema: apiSchemaRef('ErrorResponse'),
  })
  @ApiOkResponse({
    schema: apiSchemaRef('HealthStatus'),
    description: 'The API is ready to serve traffic.',
  })
  public ready(): HealthStatus {
    return this.healthService.getStatus();
  }
}
