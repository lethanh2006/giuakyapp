import { Module } from '@nestjs/common';
import { CanteenController } from './canteen.controller';
import { CanteenService } from './canteen.service';
import { UpstreamHttpModule } from '../../common/http/upstream-http.module';

@Module({
  imports: [UpstreamHttpModule],
  controllers: [CanteenController],
  providers: [CanteenService],
})
export class CanteenModule {}
