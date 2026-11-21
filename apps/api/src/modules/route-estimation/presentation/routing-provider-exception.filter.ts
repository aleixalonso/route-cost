import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import {
  RoutingProviderAuthenticationError,
  RoutingProviderInvalidResponseError,
  RoutingProviderRateLimitError,
  RoutingProviderRouteNotFoundError,
  RoutingProviderTimeoutError,
  RoutingProviderUnavailableError,
} from '@route-cost/routing';
import type { FastifyReply } from 'fastify';

import {
  type ApiErrorResponse,
  apiErrorResponse,
} from '../../../common/api-error';

@Catch(
  RoutingProviderAuthenticationError,
  RoutingProviderInvalidResponseError,
  RoutingProviderRateLimitError,
  RoutingProviderRouteNotFoundError,
  RoutingProviderTimeoutError,
  RoutingProviderUnavailableError,
)
export class RoutingProviderExceptionFilter implements ExceptionFilter {
  public catch(exception: Error, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const body = mapRoutingProviderError(exception);

    void response.status(body.statusCode).send(body);
  }
}

function mapRoutingProviderError(exception: Error): ApiErrorResponse {
  if (exception instanceof RoutingProviderRouteNotFoundError) {
    return apiErrorResponse({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'ROUTE_NOT_FOUND',
      message: 'No route was found for the requested coordinates.',
      fields: [],
    });
  }

  if (exception instanceof RoutingProviderAuthenticationError) {
    return apiErrorResponse({
      statusCode: HttpStatus.BAD_GATEWAY,
      code: 'ROUTING_PROVIDER_AUTHENTICATION_FAILED',
      message: 'The routing service could not be authenticated.',
      fields: [],
    });
  }

  if (exception instanceof RoutingProviderRateLimitError) {
    return apiErrorResponse({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'ROUTING_PROVIDER_RATE_LIMITED',
      message: 'The routing service is temporarily rate limited.',
      fields: [],
    });
  }

  if (exception instanceof RoutingProviderTimeoutError) {
    return apiErrorResponse({
      statusCode: HttpStatus.GATEWAY_TIMEOUT,
      code: 'ROUTING_PROVIDER_TIMEOUT',
      message: 'The routing service timed out.',
      fields: [],
    });
  }

  if (exception instanceof RoutingProviderInvalidResponseError) {
    return apiErrorResponse({
      statusCode: HttpStatus.BAD_GATEWAY,
      code: 'ROUTING_PROVIDER_INVALID_RESPONSE',
      message: 'The routing service returned an invalid response.',
      fields: [],
    });
  }

  return apiErrorResponse({
    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    code: 'ROUTING_PROVIDER_UNAVAILABLE',
    message: 'The routing service is temporarily unavailable.',
    fields: [],
  });
}
