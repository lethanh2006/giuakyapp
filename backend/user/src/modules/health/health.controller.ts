import { Controller, Get } from '@nestjs/common';
import { HealthService, type UserHealth } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get(['', 'live'])
  getLiveness(): UserHealth {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  getReadiness(): UserHealth {
    return this.healthService.getReadiness();
  }
}
