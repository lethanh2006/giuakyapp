import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { HealthService, type GatewayHealth } from './health.service';

@ApiExcludeController()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get(['', 'live'])
  getLiveness(): GatewayHealth {
    return this.healthService.getLiveness();
  }
}
