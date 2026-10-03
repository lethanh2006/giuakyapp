import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TodoService } from './todo.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CreateTaskDto } from './dto/create-task.dto';
import { AssignTaskDto, UpdateTaskStatusDto } from './dto/assign-task.dto';
import { MyTaskQueryDto, TaskQueryDto } from './dto/task-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@ApiTags('Api Todo')
@Controller('api/todo')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Get('my-tasks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách công việc của người dùng hiện tại' })
  async getMyTasks(@Query() query: MyTaskQueryDto, @Req() req: any) {
    return this.todoService.getMyTasks(query, req.user);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật trạng thái của một công việc' })
  @ApiParam({ name: 'id', example: '507f1f77bcf86cd799439011' })
  async updateTaskStatus(
    @Param('id') id: string,
    @Body() body: UpdateTaskStatusDto,
    @Req() req: any,
  ) {
    return this.todoService.updateTaskStatus(id, body.status, req.user);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiOperation({ summary: 'Tạo công việc mới (ADMIN, MANAGER, CHEF)' })
  async createTask(@Body() body: CreateTaskDto, @Req() req: any) {
    return this.todoService.createTask(body, req.user);
  }

  @Patch(':id/assign')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiOperation({
    summary: 'Giao lại công việc cho người dùng (ADMIN, MANAGER, CHEF)',
  })
  @ApiParam({ name: 'id', example: '507f1f77bcf86cd799439011' })
  async assignTask(
    @Param('id') id: string,
    @Body() body: AssignTaskDto,
    @Req() req: any,
  ) {
    return this.todoService.assignTask(id, body.assignedTo, req.user);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiOperation({
    summary: 'Cập nhật nội dung công việc (ADMIN, MANAGER, CHEF)',
  })
  @ApiParam({ name: 'id', example: '507f1f77bcf86cd799439011' })
  async updateTask(
    @Param('id') id: string,
    @Body() body: UpdateTaskDto,
    @Req() req: any,
  ) {
    return this.todoService.updateTask(id, body, req.user);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiOperation({ summary: 'Lấy tất cả công việc (ADMIN, MANAGER, CHEF)' })
  async getAllTasks(@Query() query: TaskQueryDto, @Req() req: any) {
    return this.todoService.getAllTasks(query, req.user);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy chi tiết công việc được phép truy cập' })
  @ApiParam({ name: 'id', example: '507f1f77bcf86cd799439011' })
  async getTaskById(@Param('id') id: string, @Req() req: any) {
    return this.todoService.getTaskById(id, req.user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiOperation({ summary: 'Xóa công việc (ADMIN, MANAGER, CHEF)' })
  @ApiParam({ name: 'id', example: '507f1f77bcf86cd799439011' })
  async deleteTask(@Param('id') id: string, @Req() req: any) {
    return this.todoService.deleteTask(id, req.user);
  }
}
