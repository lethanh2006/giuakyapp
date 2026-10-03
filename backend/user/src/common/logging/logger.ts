import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import {
  createAppLogger,
  flushLogger,
  PinoNestLogger,
} from '@nrapp/observability';

export const appLogger: ReturnType<typeof createAppLogger> = createAppLogger({
  serviceName: 'user',
});

export const nestLogger = new PinoNestLogger(appLogger, 'User');

export type LogDetails = Record<string, unknown>;

/**
 * Xuất một JSON object trên mỗi dòng stdout/stderr để log collector đọc.
 * Alert Telegram/Discord được cấu hình ở tầng monitoring, không gọi tại đây.
 */
@Injectable()
export class StructuredLoggerService {
  info(event: string, details: LogDetails): void {
    appLogger.info({ ...details, 'event.name': event }, event);
  }

  warn(event: string, details: LogDetails): void {
    appLogger.warn({ ...details, 'event.name': event }, event);
  }

  error(event: string, details: LogDetails, stack?: string): void {
    appLogger.error(
      {
        ...details,
        'event.name': event,
        ...(stack ? { 'exception.stacktrace': stack } : {}),
      },
      event,
    );
  }
}

@Injectable()
export class LoggerLifecycleService implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await flushLogger(appLogger);
  }
}
