import { HttpModule, type HttpModuleOptions } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const DEFAULT_UPSTREAM_TIMEOUT_MS = 10_000;

export function upstreamHttpOptions(value: unknown): HttpModuleOptions {
  const timeout = Number(value ?? DEFAULT_UPSTREAM_TIMEOUT_MS);
  if (!Number.isSafeInteger(timeout) || timeout < 500 || timeout > 120_000) {
    throw new Error(
      'UPSTREAM_TIMEOUT_MS phải là số nguyên trong khoảng 500-120000',
    );
  }

  return {
    timeout,
    maxRedirects: 0,
  };
}

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        upstreamHttpOptions(
          configService.get<string | number>('UPSTREAM_TIMEOUT_MS'),
        ),
    }),
  ],
  exports: [HttpModule],
})
export class UpstreamHttpModule {}
