import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';

// Service Modules
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ChatModule } from './modules/chat/chat.module';
import { TodoModule } from './modules/todo/todo.module';
import { WorkscheduleModule } from './modules/workschedule/workschedule.module';
import { CanteenModule } from './modules/canteen/canteen.module';
import { CoreModule } from './core/core.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    CoreModule,
    HealthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PassportModule.register({ defaultStrategy: 'jwt-1gio' }),
    AuthModule,
    UserModule,
    ChatModule,
    TodoModule,
    WorkscheduleModule,
    CanteenModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
