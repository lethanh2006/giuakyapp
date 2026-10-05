import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ReplyReviewDto {
  @ApiProperty({
    example: 'Cảm ơn bạn, căn tin sẽ cải thiện thời gian phục vụ',
    maxLength: 500,
    description: 'Nội dung phản hồi của căn tin',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Nội dung phản hồi phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Nội dung phản hồi không được để trống' })
  @MaxLength(500, {
    message: 'Nội dung phản hồi không được vượt quá 500 ký tự',
  })
  message: string;
}
