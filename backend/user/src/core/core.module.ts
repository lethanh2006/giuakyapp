import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { GatewaySignatureService } from '../common/security/gateway-signature.service';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { RequestIdMiddleware } from '../common/middleware/request-id.middleware';
import {
  LoggerLifecycleService,
  StructuredLoggerService,
} from '../common/logging/logger';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    StructuredLoggerService,
    GatewaySignatureService,
    LoggerLifecycleService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [StructuredLoggerService, GatewaySignatureService],
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
