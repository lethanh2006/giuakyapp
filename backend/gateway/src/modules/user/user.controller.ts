import {
  Controller,
  Get,
  Post,
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
import { UserService } from './user.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('api/user')
@ApiTags('Api User')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ============================================================
  // USER — xem profile của chính mình (full info)
  // ============================================================
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy full profile của bản thân (USER) — BFF aggregate auth + user',
  })
  async getMyProfile(@Req() req: any) {
    return this.userService.getMyProfile(req.user);
  }

  // ============================================================
  // USER — xem danh sách tất cả người dùng trong hệ thống
  // ============================================================
  @Get('user/all')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách tất cả người dùng trong hệ thống (USER)',
  })
  async getAllUsers(@Req() req: any) {
    return this.userService.getAllUsers(req.user);
  }

  // ============================================================
  // USER — xem profile public của user khác
  // ============================================================
  @Get(':userId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Xem profile public của user khác (USER) — chỉ realname',
  })
  @ApiParam({ name: 'userId', example: '1' })
  async getPublicProfile(@Param('userId') userId: string, @Req() req: any) {
    return this.userService.getPublicProfile(userId, req.user);
  }

  // ============================================================
  // USER — cập nhật thông tin tên người dùng
  // ============================================================
  @Post('update/user')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật tên hiển thị của người dùng (USER)',
  })
  async updateUser(@Body() body: UpdateUserDto, @Req() req: any) {
    return this.userService.updateUser(body, req.user);
  }

  // ============================================================
  // ADMIN — xem full profile của user bất kỳ
  // ============================================================
  @Get('admin/:userId')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Xem full profile của user bất kỳ (ADMIN) — BFF aggregate',
  })
  @ApiParam({ name: 'userId', example: '1' })
  async getFullProfileByAdmin(
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    return this.userService.getFullProfileByAdmin(userId, req.user);
  }
}
