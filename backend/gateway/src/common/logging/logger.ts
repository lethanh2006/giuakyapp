import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import {
  createAppLogger,
  flushLogger,
  PinoNestLogger,
} from '@nrapp/observability';

export const appLogger: ReturnType<typeof createAppLogger> = createAppLogger({
  serviceName: 'gateway',
});

export const nestLogger = new PinoNestLogger(appLogger, 'Gateway');

export type LogDetails = Record<string, unknown>;

/** Adapter log dùng chung cho Gateway; Pino tự gắn request_id. */
@Injectable()
export class StructuredLoggerService {
  readonly raw: ReturnType<typeof createAppLogger> = appLogger;

  info(eventName: string, details: LogDetails = {}, message?: string): void {
    this.raw.info(
      { ...details, 'event.name': eventName },
      message ?? eventName,
    );
  }

  warn(eventName: string, details: LogDetails = {}, message?: string): void {
    this.raw.warn(
      { ...details, 'event.name': eventName },
      message ?? eventName,
    );
  }

  error(eventName: string, details: LogDetails = {}, message?: string): void {
    this.raw.error(
      { ...details, 'event.name': eventName },
      message ?? eventName,
    );
  }
}

@Injectable()
export class LoggerLifecycleService implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await flushLogger(appLogger);
  }
}
