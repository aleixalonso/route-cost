import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { type Environment, validateEnvironment } from './environment';
import { buildEnvironment } from './environment.builder';
import { ENVIRONMENT } from './environment.token';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'test',
      validate: validateEnvironment,
    }),
  ],
  providers: [
    {
      provide: ENVIRONMENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Environment, true>) =>
        buildEnvironment(configService),
    },
  ],
  exports: [ENVIRONMENT],
})
export class EnvironmentModule {}
