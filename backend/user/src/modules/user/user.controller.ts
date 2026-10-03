import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayloadGuard } from '../../common/guards/user-payload.guard';
import { GatewayIdentityGuard } from '../../common/guards/gateway-identity.guard';
import { GatewayRoles } from '../../common/decorators/gateway-roles.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateNameDto } from './dto/update-name.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PublicUsersQueryDto } from './dto/public-users-query.dto';
import { UserService } from './user.service';

@Controller('api/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('internal/create-profile')
  @UseGuards(GatewayIdentityGuard)
  @GatewayRoles('admin')
  createProfile(@Body() dto: CreateProfileDto) {
    return this.userService.createProfile(dto);
  }

  @Get('internal/:id')
  // Auth/Chat/Todo còn dùng route tương thích này. Chỉ trả dữ liệu
  // danh bạ công khai; profile đầy đủ phải đi qua route admin có chữ ký.
  getInternalUser(@Param('id') id: string) {
    return this.userService.getPublicUserById(id);
  }

  @Post('internal/public-batch')
  @HttpCode(HttpStatus.OK)
  getPublicUsers(@Body() query: PublicUsersQueryDto) {
    return this.userService.getPublicUsers(query.ids);
  }

  @Post('internal/directory-batch')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GatewayIdentityGuard)
  getDirectoryUsers(
    @Body() query: PublicUsersQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.userService.getDirectoryUsers(query.ids, viewer);
  }

  @Get('internal/admin/:id')
  @UseGuards(GatewayIdentityGuard)
  @GatewayRoles('admin')
  getInternalUserForAdmin(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Patch('internal/:id/role')
  @UseGuards(GatewayIdentityGuard)
  @GatewayRoles('admin')
  updateInternalRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.userService.updateRole(id, dto);
  }

  @Get('me')
  @UseGuards(GatewayIdentityGuard)
  getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.getMyProfile(user._id);
  }

  @Get('user/all')
  @UseGuards(GatewayIdentityGuard)
  getAllUsers(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.getAllUsers(user);
  }

  @Get('user/:id')
  @UseGuards(UserPayloadGuard)
  getUser(@Param('id') id: string) {
    return this.userService.getPublicUserById(id);
  }

  @Post('update/user')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GatewayIdentityGuard)
  updateName(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNameDto,
  ) {
    return this.userService.updateName(user._id, dto);
  }
}
