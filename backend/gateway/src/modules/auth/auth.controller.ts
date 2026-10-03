import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '../../common/enums/role.enum';
import { Roles } from '../../common/decorators/roles.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UpdateEmailDto, LoginGoogleDto } from './dto/update-email.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('api/auth')
@ApiTags('Api Auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ============================================================
  // PUBLIC — không cần JWT
  // ============================================================

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Đăng ký tài khoản mới (PUBLIC)' })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập bước 1 — verify password, gửi OTP (PUBLIC)',
  })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập bước 2 — xác thực OTP, nhận token (PUBLIC)',
  })
  async verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới Access Token (PUBLIC)' })
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body);
  }

  @Post('login-google')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập bằng Google (PUBLIC)' })
  async loginWithGoogle(@Body() body: LoginGoogleDto) {
    return this.authService.loginWithGoogle(body);
  }

  // ============================================================
  // USER — cần JWT
  // ============================================================

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin auth của bản thân (USER)' })
  async getMyProfile(@Req() req: any) {
    return this.authService.getMyProfile(req.user);
  }

  @Patch('me/email')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật email của bản thân (USER)' })
  async updateMyEmail(@Body() body: UpdateEmailDto, @Req() req: any) {
    return this.authService.updateMyEmail(body, req.user);
  }

  @Delete('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa tài khoản của bản thân (USER)' })
  async deleteMyAccount(@Req() req: any) {
    return this.authService.deleteMyAccount(req.user);
  }

  // ============================================================
  // ADMIN — cần JWT + role ADMIN
  // ============================================================

  @Get('users/:userId')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lấy thông tin auth của user bất kỳ (ADMIN)' })
  @ApiParam({ name: 'userId', example: '1' })
  async getUserProfileByAdmin(
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    return this.authService.getUserProfileByAdmin(userId, req.user);
  }

  @Delete('users/:userId')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa tài khoản của user bất kỳ (ADMIN)' })
  @ApiParam({ name: 'userId', example: '1' })
  async deleteUserByAdmin(@Param('userId') userId: string, @Req() req: any) {
    return this.authService.deleteUserByAdmin(userId, req.user);
  }

  @Patch('users/:userId/role')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật vai trò người dùng (ADMIN)' })
  @ApiParam({ name: 'userId', example: '1' })
  async updateUserRole(
    @Param('userId') userId: string,
    @Body() body: { role: string },
    @Req() req: any,
  ) {
    return this.authService.updateUserRole(userId, body.role, req.user);
  }
}
