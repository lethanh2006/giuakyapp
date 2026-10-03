import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from '../../common/security/jwt.strategy';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpstreamHttpModule } from '../../common/http/upstream-http.module';

@Global()
@Module({
  imports: [UpstreamHttpModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
