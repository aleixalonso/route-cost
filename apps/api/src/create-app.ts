import helmet from '@fastify/helmet';
import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { type Environment, loadEnvironment } from './config/environment';
import { ENVIRONMENT } from './config/environment.token';
import { buildApiSchemaComponents } from './openapi/api-schemas';

export async function createApp(): Promise<NestFastifyApplication> {
  const bootstrapEnvironment = loadEnvironment();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 1_048_576,
      trustProxy: bootstrapEnvironment.TRUST_PROXY,
    }),
    {
      bufferLogs: true,
    },
  );
  const environment = app.get<Environment>(ENVIRONMENT);

  await app.register(helmet);
  app.enableCors({
    origin: environment.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
  });
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.useGlobalFilters(new ApiExceptionFilter());

  if (environment.SWAGGER_ENABLED) {
    const config = new DocumentBuilder()
      .setTitle('RouteCost API')
      .setDescription('Portable API for RouteCost.')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    document.components ??= {};
    document.components.schemas = {
      ...document.components.schemas,
      ...buildApiSchemaComponents(),
    };
    SwaggerModule.setup('docs', app, document, {
      jsonDocumentUrl: 'docs-json',
    });
  }

  app.enableShutdownHooks();
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return app;
}
