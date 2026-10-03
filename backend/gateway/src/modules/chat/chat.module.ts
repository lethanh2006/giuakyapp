import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { UpstreamHttpModule } from '../../common/http/upstream-http.module';

@Module({
  imports: [UpstreamHttpModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
