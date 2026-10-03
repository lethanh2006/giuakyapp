import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { flushLogger, logException } from '@nrapp/observability';
import { createValidationException } from './common/filters/global-exception.filter';
import { appLogger, nestLogger } from './common/logging/logger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: nestLogger });

  // VPS topology: Internet -> host Nginx -> Gateway container.
  // Trust exactly one HTTP proxy so request.ip resolves to the real client IP.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.enableShutdownHooks();

  // 1. Configure bodyParser JSON payload limits
  app.use(bodyParser.json({ limit: '10mb' }));

  // 2. Enable Cross-Origin Resource Sharing (CORS)
  app.enableCors({
    origin: '*',
    credentials: false,
  });

  // 3. Setup global validation pipes matching user DTO validation standards
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: createValidationException,
    }),
  );

  // 4. Configure Centralized Swagger UI route using native SwaggerModule scanning
  const config = new DocumentBuilder()
    .setTitle(
      process.env.TITLE_SWAGGER ||
        process.env.TITTLE_SWAGGER ||
        'Centralized API Gateway',
    )
    .setDescription(
      process.env.CONTENT_SWAGGER || 'API Gateway for Microservices',
    )
    .setVersion(process.env.VERSION_SWAGGER || '1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(
    process.env.ENDPOINT_SWAGGER || 'api-docs',
    app,
    document,
  );

  // 5. Setup WebSocket / Socket.io reverse proxy for Chat Service
  const chatServiceUrl =
    process.env.CHAT_SERVICE_URL || 'http://localhost:5002';
  const socketProxy = createProxyMiddleware('/socket.io', {
    target: chatServiceUrl,
    changeOrigin: true,
    ws: true,
    onError: (err: any, _req: any, response: any) => {
      const result = logException(
        appLogger,
        'chat.socket_proxy.failed',
        err,
        {
          'server.address': 'chat',
          'network.protocol.name': 'socket.io',
          'http.response.status_code': 502,
        },
        {
          classification: {
            statusCode: 502,
            code: 'CHAT_SOCKET_PROXY_UNAVAILABLE',
            expected: false,
            retryable: true,
          },
        },
      );
      if (typeof response?.writeHead === 'function' && !response.headersSent) {
        response.writeHead(502, { 'Content-Type': 'application/json' });
        response.end(
          JSON.stringify({
            statusCode: 502,
            code: 'CHAT_REALTIME_UNAVAILABLE',
            message: 'Chat realtime hiện không khả dụng',
            errorId: result.errorId,
          }),
        );
      }
    },
  });

  // Giữ nguyên /socket.io khi forward cả HTTP polling lẫn WebSocket upgrade.
  app.use(socketProxy);

  // 6. Start the API Gateway HTTP Server
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  appLogger.info(
    {
      'event.name': 'gateway.started',
      'server.address': '0.0.0.0',
      'server.port': Number(port),
    },
    'Gateway started',
  );

  // 7. Bind WebSocket Upgrade listener for Socket.io traffic
  const server = app.getHttpServer();
  server.on('upgrade', (req: any, socket: any, head: any) => {
    socketProxy.upgrade(req, socket, head);
  });
}

void bootstrap().catch(async (error: unknown) => {
  logException(
    appLogger,
    'process.bootstrap.failed',
    error,
    {},
    {
      message: 'Không thể khởi động API Gateway',
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
