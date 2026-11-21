import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import {
  type ApiErrorResponse,
  apiErrorResponse,
} from '../../../common/api-error';
import {
  FuelPriceProviderInvalidResponseError,
  FuelPriceProviderTimeoutError,
  FuelPriceProviderUnavailableError,
  VehicleFuelProductUnsupportedError,
} from '../application/fuel-price-errors';

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

function mapFuelPriceError(exception: Error): ApiErrorResponse {
  if (exception instanceof VehicleFuelProductUnsupportedError) {
    return apiErrorResponse({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'VEHICLE_FUEL_PRODUCT_UNSUPPORTED',
      message: 'The selected vehicle has no supported fuel price product.',
      fields: [],
    });
  }

  if (exception instanceof FuelPriceProviderTimeoutError) {
    return apiErrorResponse({
      statusCode: HttpStatus.GATEWAY_TIMEOUT,
      code: 'FUEL_PRICE_PROVIDER_TIMEOUT',
      message: 'The fuel price provider timed out.',
      fields: [],
    });
  }

  if (exception instanceof FuelPriceProviderInvalidResponseError) {
    return apiErrorResponse({
      statusCode: HttpStatus.BAD_GATEWAY,
      code: 'FUEL_PRICE_PROVIDER_INVALID_RESPONSE',
      message: 'The fuel price provider returned invalid data.',
      fields: [],
    });
  }

  return apiErrorResponse({
    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    code: 'FUEL_PRICE_PROVIDER_UNAVAILABLE',
    message: 'The fuel price provider is temporarily unavailable.',
    fields: [],
  });
}
