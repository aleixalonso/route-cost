import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { VehicleNotFoundApplicationError } from '../application/vehicle-not-found.error';

@Catch(VehicleNotFoundApplicationError)
export class VehicleNotFoundExceptionFilter implements ExceptionFilter {
  public catch(
    _exception: VehicleNotFoundApplicationError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();

    void response.status(HttpStatus.NOT_FOUND).send({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'VEHICLE_NOT_FOUND',
      message: 'The requested vehicle was not found.',
    });
  }
}
