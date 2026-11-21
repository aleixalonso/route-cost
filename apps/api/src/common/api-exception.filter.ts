import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { apiErrorResponse, frameworkApiError } from './api-error';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    if (!(exception instanceof HttpException)) {
      void response.status(500).send(frameworkApiError(500));
      return;
    }

    const statusCode = exception.getStatus();
    const payload: unknown = exception.getResponse();
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'code' in payload &&
      typeof payload.code === 'string'
    ) {
      const message =
        'message' in payload && typeof payload.message === 'string'
          ? payload.message
          : frameworkApiError(statusCode).message;
      const fields =
        'fields' in payload &&
        Array.isArray(payload.fields) &&
        payload.fields.every((field: unknown) => typeof field === 'string')
          ? payload.fields
          : [];
      void response
        .status(statusCode)
        .send(
          apiErrorResponse({ statusCode, code: payload.code, message, fields }),
        );
      return;
    }

    void response.status(statusCode).send(frameworkApiError(statusCode));
  }
}
