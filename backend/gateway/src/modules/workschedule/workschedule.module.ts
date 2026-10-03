import { Module } from '@nestjs/common';
import { WorkscheduleController } from './workschedule.controller';
import { WorkscheduleService } from './workschedule.service';
import { UpstreamHttpModule } from '../../common/http/upstream-http.module';

@Module({
  imports: [UpstreamHttpModule],
  controllers: [WorkscheduleController],
  providers: [WorkscheduleService],
})
export class WorkscheduleModule {}
