import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ConnectionStates, type Connection } from 'mongoose';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

export interface UserHealth {
  status: 'ok' | 'error';
  service: 'user';
  dependencies?: {
    mongodb: 'up' | 'down';
    rabbitmq: 'up' | 'down';
  };
}

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  getLiveness(): UserHealth {
    return { status: 'ok', service: 'user' };
  }

  getReadiness(): UserHealth {
    const dependencies = {
      mongodb:
        this.mongoConnection.readyState === ConnectionStates.connected
          ? ('up' as const)
          : ('down' as const),
      rabbitmq: this.rabbitMQService.isReady()
        ? ('up' as const)
        : ('down' as const),
    };
    const result: UserHealth = {
      status: Object.values(dependencies).every((value) => value === 'up')
        ? 'ok'
        : 'error',
      service: 'user',
      dependencies,
    };

    if (result.status === 'error') {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }
}
