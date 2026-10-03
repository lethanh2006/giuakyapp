import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum WorkRequestType {
  LEAVE = 'leave',
  LATE = 'late',
  EARLY = 'early',
  OVERTIME = 'overtime',
  BUSINESS_TRIP = 'business_trip',
  REMOTE = 'remote',
}

export enum WorkPeriod {
  FULL_DAY = 'full_day',
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
}

export class CreateWorkRequestDto {
  @ApiProperty({ enum: WorkRequestType })
  @IsEnum(WorkRequestType)
  type: WorkRequestType;

  @ApiProperty({ example: '2026-08-10T08:30:00.000Z' })
  @IsISO8601()
  start_at: string;

  @ApiPropertyOptional({ example: '2026-08-10T17:30:00.000Z' })
  @IsOptional()
  @IsISO8601()
  end_at?: string;

  @ApiProperty({ enum: WorkPeriod, default: WorkPeriod.FULL_DAY })
  @IsEnum(WorkPeriod)
  period: WorkPeriod;

  @ApiProperty({ example: 'Mô tả lý do cụ thể' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  project?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimated_cost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  manager_id?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachment_urls?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_school_leave?: boolean;
}
