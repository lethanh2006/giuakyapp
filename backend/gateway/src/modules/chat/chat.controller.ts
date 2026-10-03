import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatService, type UploadedChatImage } from './chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { filterSupportedChatImage } from './chat-image-upload';

@ApiTags('Api Chat')
@Controller('api/chat')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('chat/new')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo cuộc trò chuyện mới' })
  async createChat(
    @Body() body: CreateChatDto,
    @Req() req: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.chatService.createChat(body, req.user);
    response.status(result.statusCode);
    return result.body;
  }

  @Get('chat/all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách tất cả trò chuyện' })
  async getAllChats(@Req() req: any) {
    return this.chatService.getAllChats(req.user);
  }

  @Post('message')
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) =>
        filterSupportedChatImage(file, callback),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['chatId'],
      properties: {
        chatId: { type: 'string' },
        text: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Gửi tin nhắn mới (chứa text hoặc file ảnh)' })
  async sendMessage(
    @Body() body: SendMessageDto,
    @UploadedFile() image: UploadedChatImage | undefined,
    @Req() req: any,
  ) {
    return this.chatService.sendMessage(body, image, req.user);
  }

  @Get('message/:chatId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách tin nhắn theo ID cuộc trò chuyện' })
  @ApiParam({ name: 'chatId', example: 'chatId123' })
  async getMessages(@Param('chatId') chatId: string, @Req() req: any) {
    return this.chatService.getMessages(chatId, req.user);
  }
}
