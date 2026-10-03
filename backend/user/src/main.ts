import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { flushLogger, logException } from '@nrapp/observability';
import { AppModule } from './app.module';
import { appLogger, nestLogger } from './common/logging/logger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: nestLogger,
  });

  app.enableShutdownHooks();
  app.enableCors({
    origin: '*',
    credentials: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  const port = process.env.PORT || 5000;
  await app.listen(port);
  appLogger.info(
    {
      'event.name': 'service.started',
      'server.port': Number(port),
    },
    'User service đã khởi động',
  );
}

void bootstrap().catch(async (error: unknown) => {
  logException(
    appLogger,
    'process.bootstrap.failed',
    error,
    {},
    {
      message: 'Không thể khởi động dịch vụ người dùng',
      classification: {
        statusCode: 500,
        code: 'BOOTSTRAP_FAILED',
        expected: false,
        retryable: false,
        logLevel: 'fatal',
      },
    },
  );
  await flushLogger(appLogger);
  process.exitCode = 1;
});
