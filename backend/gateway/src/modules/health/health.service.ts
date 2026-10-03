import { Injectable } from '@nestjs/common';

export interface GatewayHealth {
  status: 'ok';
  service: 'gateway';
}

@Injectable()
export class HealthService {
  getLiveness(): GatewayHealth {
    return { status: 'ok', service: 'gateway' };
  }
}
