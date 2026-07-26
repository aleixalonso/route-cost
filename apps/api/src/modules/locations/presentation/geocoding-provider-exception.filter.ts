import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import {
  GeocodingProviderAuthenticationError,
  GeocodingProviderInvalidResponseError,
  GeocodingProviderRateLimitError,
  GeocodingProviderTimeoutError,
  GeocodingProviderUnavailableError,
  LocationNotFoundError,
} from '@route-cost/geocoding';
import type { FastifyReply } from 'fastify';

interface ErrorResponse {
  statusCode: number;
  code: string;
  message: string;
}

@Catch(
  GeocodingProviderAuthenticationError,
  GeocodingProviderInvalidResponseError,
  GeocodingProviderRateLimitError,
  GeocodingProviderTimeoutError,
  GeocodingProviderUnavailableError,
  LocationNotFoundError,
)
export class GeocodingProviderExceptionFilter implements ExceptionFilter {
  public catch(exception: Error, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const body = mapGeocodingProviderError(exception);

    void response.status(body.statusCode).send(body);
  }
}

function mapGeocodingProviderError(exception: Error): ErrorResponse {
  if (exception instanceof LocationNotFoundError) {
    return {
      statusCode: HttpStatus.NOT_FOUND,
      code: 'LOCATION_NOT_FOUND',
      message: 'The requested location was not found.',
    };
  }

  if (exception instanceof GeocodingProviderAuthenticationError) {
    return {
      statusCode: HttpStatus.BAD_GATEWAY,
      code: 'GEOCODING_PROVIDER_AUTHENTICATION_FAILED',
      message: 'The location search service could not be authenticated.',
    };
  }

  if (exception instanceof GeocodingProviderRateLimitError) {
    return {
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'GEOCODING_PROVIDER_RATE_LIMITED',
      message: 'The location search service is temporarily rate limited.',
    };
  }

  if (exception instanceof GeocodingProviderTimeoutError) {
    return {
      statusCode: HttpStatus.GATEWAY_TIMEOUT,
      code: 'GEOCODING_PROVIDER_TIMEOUT',
      message: 'The location search service timed out.',
    };
  }

  if (exception instanceof GeocodingProviderInvalidResponseError) {
    return {
      statusCode: HttpStatus.BAD_GATEWAY,
      code: 'GEOCODING_PROVIDER_INVALID_RESPONSE',
      message: 'The location search service returned an invalid response.',
    };
  }

  return {
    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    code: 'GEOCODING_PROVIDER_UNAVAILABLE',
    message: 'The location search service is temporarily unavailable.',
  };
}
