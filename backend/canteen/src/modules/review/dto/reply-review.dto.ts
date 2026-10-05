import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { REVIEW_COMMENT_MAX_LENGTH } from '../../../schemas/reviews.schema';

export class ReplyReviewDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Nội dung phản hồi phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Nội dung phản hồi không được để trống' })
  @MaxLength(REVIEW_COMMENT_MAX_LENGTH, {
    message: `Nội dung phản hồi không được vượt quá ${REVIEW_COMMENT_MAX_LENGTH} ký tự`,
  })
  message!: string;
}
