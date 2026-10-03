import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateChatDto {
  @ApiProperty({
    example: 'userId456',
    description: 'ID của người dùng muốn tạo cuộc trò chuyện cùng',
  })
  @IsNotEmpty({ message: 'otherUserId không được để trống' })
  @IsMongoId({ message: 'otherUserId phải là MongoDB ObjectId hợp lệ' })
  otherUserId: string;
}
