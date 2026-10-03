import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WorkscheduleService } from './workschedule.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '../../common/enums/role.enum';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CreateScheduleRequestDto } from './dto/create-request.dto';
import {
  UpdateScheduleEntriesDto,
  UpdatePolicyDto,
  ScanAttendanceDto,
  RejectRequestDto,
  BulkApproveDto,
} from './dto/update-entries.dto';
import { CreateWorkRequestDto } from './dto/work-request.dto';

@ApiTags('Api Workschedule')
@Controller('api/workschedule')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkscheduleController {
  constructor(private readonly workscheduleService: WorkscheduleService) {}

  // ============================================================
  // ADMIN — Lịch trình quản trị
  // ============================================================

  @Get('schedule/pending')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiOperation({
    summary: 'Lấy danh sách yêu cầu lịch làm việc chờ phê duyệt (Admin)',
  })
  async getPendingRequests(
    @Query() query: Record<string, string>,
    @Req() req: any,
  ) {
    return this.workscheduleService.getPendingRequests(query, req.user);
  }

  @Get('schedule/all')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiOperation({
    summary: 'Lấy tất cả danh sách yêu cầu lịch làm việc (Admin)',
  })
  async getAllRequests(
    @Query() query: Record<string, string>,
    @Req() req: any,
  ) {
    return this.workscheduleService.getAllRequests(query, req.user);
  }

  @Post('schedule/requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiOperation({ summary: 'Duyệt yêu cầu lịch làm việc (Admin)' })
  @ApiParam({ name: 'id', example: 'req123' })
  async approveRequest(@Param('id') id: string, @Req() req: any) {
    return this.workscheduleService.approveRequest(id, req.user);
  }

  @Post('schedule/requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiOperation({ summary: 'Từ chối yêu cầu lịch làm việc (Admin)' })
  @ApiParam({ name: 'id', example: 'req123' })
  async rejectRequest(
    @Param('id') id: string,
    @Body() body: RejectRequestDto,
    @Req() req: any,
  ) {
    return this.workscheduleService.rejectRequest(id, body, req.user);
  }

  @Post('schedule/requests/bulk-approve')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiOperation({
    summary: 'Phê duyệt hàng loạt yêu cầu lịch làm việc (Admin)',
  })
  async bulkApprove(@Body() body: BulkApproveDto, @Req() req: any) {
    return this.workscheduleService.bulkApprove(body, req.user);
  }

  @Get('schedule/heatmap')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiOperation({ summary: 'Lấy dữ liệu heatmap lịch làm việc (Admin)' })
  async getHeatmap(@Query() query: Record<string, string>, @Req() req: any) {
    return this.workscheduleService.getHeatmap(query, req.user);
  }

  // ============================================================
  // USER / ADMIN — Điểm danh (Attendance)
  // ============================================================

  @Post('attendance/scan')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Điểm danh bằng quét QR Code' })
  async scanAttendance(@Body() body: ScanAttendanceDto, @Req() req: any) {
    return this.workscheduleService.scanAttendance(body, req.user);
  }

  @Get('attendance/my')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách điểm danh cá nhân' })
  async getMyAttendance(
    @Query() query: Record<string, string>,
    @Req() req: any,
  ) {
    return this.workscheduleService.getMyAttendance(query, req.user);
  }

  @Post('attendance/qr/generate')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiOperation({ summary: 'Tạo mã QR Code điểm danh (Admin)' })
  async generateQrToken(@Req() req: any) {
    return this.workscheduleService.generateQrToken(req.user);
  }

  @Get('attendance/today')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiOperation({ summary: 'Lấy danh sách điểm danh hôm nay (Admin)' })
  async getTodayAttendance(@Req() req: any) {
    return this.workscheduleService.getTodayAttendance(req.user);
  }

  @Get('attendance/report')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiOperation({ summary: 'Lấy báo cáo điểm danh (Admin)' })
  async getReport(@Query() query: Record<string, string>, @Req() req: any) {
    return this.workscheduleService.getReport(query, req.user);
  }

  // ============================================================
  // PUBLIC / ADMIN — Chính sách điểm danh (Policy)
  // ============================================================

  @Get('policy')
  @Public()
  @ApiOperation({ summary: 'Lấy chính sách chấm công (PUBLIC)' })
  async getPolicy() {
    return this.workscheduleService.getPolicy();
  }

  @Patch('policy')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật chính sách chấm công (Admin)' })
  async updatePolicy(@Body() body: UpdatePolicyDto, @Req() req: any) {
    return this.workscheduleService.updatePolicy(body, req.user);
  }

  // ============================================================
  // USER — Đăng ký lịch làm việc (Schedule requests)
  // ============================================================

  @Get('schedule/monthly-overview')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy lịch làm việc và thống kê cá nhân theo tháng' })
  async getMonthlyOverview(@Query('month') month: string, @Req() req: any) {
    return this.workscheduleService.getMonthlyOverview(month, req.user);
  }

  @Get('schedule/my')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách lịch làm việc của bản thân' })
  async getMySchedules(
    @Query() query: Record<string, string>,
    @Req() req: any,
  ) {
    return this.workscheduleService.getMySchedules(query, req.user);
  }

  @Post('schedule/requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo và gửi yêu cầu đăng ký lịch làm việc' })
  async createRequest(@Body() body: CreateScheduleRequestDto, @Req() req: any) {
    return this.workscheduleService.createRequest(body, req.user);
  }

  @Post('schedule/requests/:id/resubmit')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chỉnh sửa và gửi lại yêu cầu lịch bị từ chối' })
  @ApiParam({ name: 'id', example: 'req123' })
  async resubmitRequest(
    @Param('id') id: string,
    @Body() body: UpdateScheduleEntriesDto,
    @Req() req: any,
  ) {
    return this.workscheduleService.resubmitRequest(id, body, req.user);
  }

  @Get('schedule/requests/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiOperation({ summary: 'Xem chi tiết một yêu cầu lịch làm việc' })
  @ApiParam({ name: 'id', example: 'req123' })
  async getRequestInfo(@Param('id') id: string, @Req() req: any) {
    return this.workscheduleService.getRequestInfo(id, req.user);
  }

  @Patch('schedule/requests/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiOperation({ summary: 'Cập nhật nội dung một yêu cầu lịch làm việc' })
  @ApiParam({ name: 'id', example: 'req123' })
  async updateEntries(
    @Param('id') id: string,
    @Body() body: UpdateScheduleEntriesDto,
    @Req() req: any,
  ) {
    return this.workscheduleService.updateEntries(id, body, req.user);
  }

  @Delete('schedule/requests/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiOperation({ summary: 'Xóa yêu cầu đăng ký lịch làm việc' })
  @ApiParam({ name: 'id', example: 'req123' })
  async deleteRequest(@Param('id') id: string, @Req() req: any) {
    return this.workscheduleService.deleteRequest(id, req.user);
  }

  // ============================================================
  // USER / ADMIN — Đơn từ nhân sự
  // ============================================================

  @Get('requests/my/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thống kê đơn từ cá nhân theo tháng' })
  async getMyWorkRequestStats(@Query('month') month: string, @Req() req: any) {
    return this.workscheduleService.getMyWorkRequestStats(month, req.user);
  }

  @Get('requests/my')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy lịch sử đơn từ của bản thân' })
  async getMyWorkRequests(
    @Query() query: Record<string, string>,
    @Req() req: any,
  ) {
    return this.workscheduleService.getMyWorkRequests(query, req.user);
  }

  @Post('requests')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo đơn nghỉ, đi muộn, về sớm, OT, công tác hoặc remote',
  })
  async createWorkRequest(@Body() body: CreateWorkRequestDto, @Req() req: any) {
    return this.workscheduleService.createWorkRequest(body, req.user);
  }

  @Patch('requests/:id/cancel')
  @ApiBearerAuth()
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Hủy đơn đang chờ duyệt của bản thân' })
  async cancelWorkRequest(@Param('id') id: string, @Req() req: any) {
    return this.workscheduleService.cancelWorkRequest(id, req.user);
  }

  @Get('requests/admin')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiOperation({ summary: 'Lấy danh sách đơn từ để quản lý xử lý' })
  async getAdminWorkRequests(
    @Query() query: Record<string, string>,
    @Req() req: any,
  ) {
    return this.workscheduleService.getAdminWorkRequests(query, req.user);
  }

  @Post('requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Duyệt đơn từ của nhân viên' })
  async approveWorkRequest(@Param('id') id: string, @Req() req: any) {
    return this.workscheduleService.approveWorkRequest(id, req.user);
  }

  @Post('requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MANAGER, Role.CHEF)
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Từ chối đơn từ của nhân viên' })
  async rejectWorkRequest(
    @Param('id') id: string,
    @Body() body: RejectRequestDto,
    @Req() req: any,
  ) {
    return this.workscheduleService.rejectWorkRequest(id, body, req.user);
  }
}
