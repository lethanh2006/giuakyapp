import { ApiProperty } from '@nestjs/swagger';
import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    example: 'chatId123',
    description: 'ID của cuộc trò chuyện cần gửi tin nhắn',
  })
  @IsNotEmpty({ message: 'chatId không được để trống' })
  @IsMongoId({ message: 'chatId phải là MongoDB ObjectId hợp lệ' })
  chatId: string;

  @ApiProperty({
    example: 'Hello there!',
    description: 'Nội dung tin nhắn dạng văn bản (text)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Tin nhắn không được vượt quá 1000 ký tự' })
  text?: string;
}
