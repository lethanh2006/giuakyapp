import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from './core/core.module';
import { DatabaseModule } from './modules/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { RabbitMQModule } from './modules/rabbitmq/rabbitmq.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    CoreModule,
    DatabaseModule,
    RabbitMQModule,
    HealthModule,
    UserModule,
  ],
})
export class AppModule {}
