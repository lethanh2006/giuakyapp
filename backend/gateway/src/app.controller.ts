import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller()
export class AppController {
  @Get()
  getHealthCheck() {
    return {
      message:
        'API Gateway is running (API Gateway đang hoạt động bình thường)',
      services: [
        '/api/auth',
        '/api/user',
        '/api/chat',
        '/api/todo',
        '/api/workschedule',
        '/api/canteen',
        '/api/payment',
      ],
    };
  }
}
