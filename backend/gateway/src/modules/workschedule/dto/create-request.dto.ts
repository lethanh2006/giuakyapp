import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkPeriod } from './work-request.dto';

export enum ScheduleEntryType {
  OFFICE = 'office',
  REMOTE = 'remote',
  DAY_OFF = 'day_off',
  LEAVE = 'leave',
}

export class ScheduleEntryDto {
  @ApiProperty({
    example: '2026-07-20',
    description: 'Ngày của lịch làm việc (YYYY-MM-DD)',
  })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: ScheduleEntryType, example: ScheduleEntryType.OFFICE })
  @IsEnum(ScheduleEntryType)
  type: ScheduleEntryType;

  @ApiProperty({ enum: WorkPeriod, example: WorkPeriod.FULL_DAY })
  @IsEnum(WorkPeriod)
  period: WorkPeriod;

  @ApiProperty({ required: false, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class CreateScheduleRequestDto {
  @ApiProperty({
    example: '2026-09',
    description: 'Tháng đăng ký lịch làm việc (YYYY-MM)',
  })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month phải có định dạng YYYY-MM',
  })
  month: string;

  @ApiProperty({
    type: [ScheduleEntryDto],
    description: 'Chi tiết lịch đăng ký từng ngày trong tháng',
  })
  @IsArray({ message: 'entries phải là một mảng' })
  @ArrayMinSize(1)
  @ArrayMaxSize(31)
  @ValidateNested({ each: true })
  @Type(() => ScheduleEntryDto)
  entries: ScheduleEntryDto[];
}
