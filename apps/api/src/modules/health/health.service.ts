import { Injectable } from '@nestjs/common';
import type { HealthStatus } from '@route-cost/contracts';

@Injectable()
export class HealthService {
  public getStatus(): HealthStatus {
    return {
      status: 'ok',
      service: 'route-cost-api',
    };
  }
}
