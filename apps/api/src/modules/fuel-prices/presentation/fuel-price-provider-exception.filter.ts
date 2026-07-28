import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import {
  FuelPriceProviderInvalidResponseError,
  FuelPriceProviderTimeoutError,
  FuelPriceProviderUnavailableError,
  VehicleFuelProductUnsupportedError,
} from '../application/fuel-price-errors';

interface ErrorResponse {
  readonly statusCode: number;
  readonly code: string;
  readonly message: string;
}

@Catch(
  VehicleFuelProductUnsupportedError,
  FuelPriceProviderInvalidResponseError,
  FuelPriceProviderTimeoutError,
  FuelPriceProviderUnavailableError,
)
export class FuelPriceProviderExceptionFilter implements ExceptionFilter {
  public catch(exception: Error, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const body = mapFuelPriceError(exception);

    void response.status(body.statusCode).send(body);
  }
}

function mapFuelPriceError(exception: Error): ErrorResponse {
  if (exception instanceof VehicleFuelProductUnsupportedError) {
    return {
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'VEHICLE_FUEL_PRODUCT_UNSUPPORTED',
      message: 'The selected vehicle has no supported fuel price product.',
    };
  }

  if (exception instanceof FuelPriceProviderTimeoutError) {
    return {
      statusCode: HttpStatus.GATEWAY_TIMEOUT,
      code: 'FUEL_PRICE_PROVIDER_TIMEOUT',
      message: 'The fuel price provider timed out.',
    };
  }

  if (exception instanceof FuelPriceProviderInvalidResponseError) {
    return {
      statusCode: HttpStatus.BAD_GATEWAY,
      code: 'FUEL_PRICE_PROVIDER_INVALID_RESPONSE',
      message: 'The fuel price provider returned invalid data.',
    };
  }

  return {
    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    code: 'FUEL_PRICE_PROVIDER_UNAVAILABLE',
    message: 'The fuel price provider is temporarily unavailable.',
  };
}
