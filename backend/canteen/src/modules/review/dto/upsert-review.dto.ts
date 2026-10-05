import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { REVIEW_COMMENT_MAX_LENGTH } from '../../../schemas/reviews.schema';

export class UpsertReviewDto {
  @IsInt({ message: 'Số sao phải là số nguyên' })
  @Min(1, { message: 'Số sao tối thiểu là 1' })
  @Max(5, { message: 'Số sao tối đa là 5' })
  rating!: number;

  @IsOptional()
  @IsString({ message: 'Nhận xét phải là chuỗi ký tự' })
  @MaxLength(REVIEW_COMMENT_MAX_LENGTH, {
    message: `Nhận xét không được vượt quá ${REVIEW_COMMENT_MAX_LENGTH} ký tự`,
  })
  comment?: string;
}
