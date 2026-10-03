import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CanteenService } from './canteen.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '../../common/enums/role.enum';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { TableQueryDto } from './dto/table-query.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';

@ApiTags('Api Canteen')
@Controller('api/canteen')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CanteenController {
  constructor(private readonly canteenService: CanteenService) {}

  // --- 3.1 Nhóm API Thực Đơn (Menu APIs) ---

  @Get('menu')
  @Public()
  @ApiOperation({
    summary: 'Lấy thực đơn đang bán, phân nhóm theo danh mục đang hoạt động',
  })
  async getMenu() {
    return this.canteenService.getMenu();
  }

  @Get('menu/search')
  @Public()
  @ApiOperation({
    summary: 'Tìm kiếm món ăn đang bán theo tên',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description:
      'Chuỗi con trong tên món; không phân biệt hoa thường; bỏ trống để lấy toàn bộ món đang bán',
    example: 'cơm tấm',
  })
  async searchMenu(@Query('q') query: string) {
    return this.canteenService.searchMenu(query || '');
  }

  @Get('admin/menu')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Lấy toàn bộ món và danh mục, kể cả dữ liệu đang ẩn',
  })
  async getAdminMenu(@Req() req: any) {
    return this.canteenService.getAdminMenu(req.user);
  }

  @Post('admin/menu')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo mới món ăn (ADMIN)' })
  async createMenuItem(@Body() body: CreateMenuItemDto, @Req() req: any) {
    return this.canteenService.createMenuItem(body, req.user);
  }

  @Put('admin/menu/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật thông tin món ăn (ADMIN)' })
  async updateMenuItem(
    @Param('id') id: string,
    @Body() body: UpdateMenuItemDto,
    @Req() req: any,
  ) {
    return this.canteenService.updateMenuItem(id, body, req.user);
  }

  @Delete('admin/menu/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Xóa món ăn và lưu dữ liệu vào lịch sử hoàn tác (ADMIN)',
  })
  async deleteMenuItem(@Param('id') id: string, @Req() req: any) {
    return this.canteenService.deleteMenuItem(id, req.user);
  }

  @Post('admin/menu/undo')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Hoàn tác (Undo) thao tác sửa đổi vừa thực hiện trên Menu (ADMIN)',
  })
  async undoMenuItemChange(@Req() req: any) {
    return this.canteenService.undoMenuItemChange(req.user);
  }

  @Post('admin/menu/redo')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Làm lại (Redo) thao tác vừa hoàn tác trên Menu (ADMIN)',
  })
  async redoMenuItemChange(@Req() req: any) {
    return this.canteenService.redoMenuItemChange(req.user);
  }

  // --- 3.2 Nhóm API Đơn Hàng (Order APIs) ---

  @Post('orders')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo đơn hàng với trạng thái ban đầu CREATED',
  })
  async createOrder(@Body() body: CreateOrderDto, @Req() req: any) {
    return this.canteenService.createOrder(body, req.user);
  }

  @Get('orders')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Lấy danh sách đơn hàng có lọc và phân trang cho nhân viên vận hành',
  })
  async getOrders(@Query() query: OrderQueryDto, @Req() req: any) {
    return this.canteenService.getOrders(query, req.user);
  }

  @Get('orders/my-orders')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xem lịch sử đơn hàng cá nhân' })
  async getMyOrders(@Req() req: any) {
    return this.canteenService.getMyOrders(req.user);
  }

  @Get('orders/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin chi tiết của một đơn hàng' })
  async getOrderById(@Param('id') id: string, @Req() req: any) {
    return this.canteenService.getOrderById(id, req.user);
  }

  @Patch('orders/:id/cancel')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Hủy đơn hàng (chủ đơn hoặc nhân viên có quyền vận hành)',
  })
  async cancelOrder(
    @Param('id') id: string,
    @Body() body: CancelOrderDto,
    @Req() req: any,
  ) {
    return this.canteenService.cancelOrder(id, body, req.user);
  }

  @Patch('orders/:id/payment/cash')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Admin xác nhận đã thu tiền mặt và đóng đơn',
  })
  async confirmCashPayment(@Param('id') id: string, @Req() req: any) {
    return this.canteenService.confirmCashPayment(id, req.user);
  }

  // --- 3.4 Nhóm API Quản Lý Bàn Ăn (Table APIs) ---

  @Get('tables')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách bàn ăn có tìm kiếm, sắp xếp và phân trang',
  })
  async getAllTables(@Query() query: TableQueryDto, @Req() req: any) {
    return this.canteenService.getAllTables(query, req.user);
  }

  @Get('tables/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin bàn ăn theo ID' })
  async getTableById(@Param('id') id: string, @Req() req: any) {
    return this.canteenService.getTableById(id, req.user);
  }

  @Post('tables')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Khởi tạo bàn ăn mới (ADMIN)' })
  async createTable(@Body() body: CreateTableDto, @Req() req: any) {
    return this.canteenService.createTable(body, req.user);
  }

  @Patch('tables/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật thông tin bàn ăn (ADMIN)' })
  async updateTable(
    @Param('id') id: string,
    @Body() body: UpdateTableDto,
    @Req() req: any,
  ) {
    return this.canteenService.updateTable(id, body, req.user);
  }

  @Delete('tables/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa bàn ăn đang trống (ADMIN)' })
  async deleteTable(@Param('id') id: string, @Req() req: any) {
    return this.canteenService.deleteTable(id, req.user);
  }

  @Patch('tables/:id/status')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Cập nhật trạng thái bàn ăn (empty, occupied, reserved) (ADMIN)',
  })
  async updateTableStatus(
    @Param('id') id: string,
    @Body() body: UpdateTableStatusDto,
    @Req() req: any,
  ) {
    return this.canteenService.updateTableStatus(id, body, req.user);
  }

  // --- Nhóm API Quản Lý Danh Mục (Category APIs) ---

  @Get('categories')
  @Public()
  @ApiOperation({
    summary: 'Lấy danh sách danh mục có tìm kiếm, sắp xếp và phân trang',
  })
  async getCategories(@Query() query: CategoryQueryDto) {
    return this.canteenService.getCategories(query);
  }

  @Get('categories/:id')
  @Public()
  @ApiOperation({ summary: 'Lấy thông tin danh mục theo ID' })
  async getCategoryById(@Param('id') id: string) {
    return this.canteenService.getCategoryById(id);
  }

  @Post('categories')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo danh mục món ăn (ADMIN)' })
  async createCategory(@Body() body: CreateCategoryDto, @Req() req: any) {
    return this.canteenService.createCategory(body, req.user);
  }

  @Patch('categories/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật danh mục món ăn (ADMIN)' })
  async updateCategory(
    @Param('id') id: string,
    @Body() body: UpdateCategoryDto,
    @Req() req: any,
  ) {
    return this.canteenService.updateCategory(id, body, req.user);
  }

  @Delete('categories/:id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Xóa danh mục chưa có món ăn liên quan (ADMIN)',
  })
  async deleteCategory(@Param('id') id: string, @Req() req: any) {
    return this.canteenService.deleteCategory(id, req.user);
  }
}
