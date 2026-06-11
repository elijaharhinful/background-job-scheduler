import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { JobPriority } from '../../common/enums/job-priority.enum';
import { RecurrenceInterval } from '../../common/enums/recurrence-interval.enum';

export class CreateJobDto {
  @ApiProperty({ example: 'send_email' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    example: { to: 'user@example.com', subject: 'Welcome' },
  })
  @IsObject()
  @IsNotEmpty()
  payload: Record<string, unknown>;

  @ApiPropertyOptional({ enum: JobPriority, default: JobPriority.MEDIUM })
  @IsOptional()
  @Type(() => Number)
  @IsEnum(JobPriority)
  priority?: JobPriority = JobPriority.MEDIUM;

  @ApiPropertyOptional({ example: 3, default: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetries?: number = 3;

  @ApiPropertyOptional({ type: Date, example: '2025-01-01T00:00:00Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date;

  @ApiPropertyOptional({ enum: RecurrenceInterval })
  @IsOptional()
  @IsEnum(RecurrenceInterval)
  recurrenceInterval?: RecurrenceInterval;

  @ApiPropertyOptional({
    type: [String],
    description: 'IDs of jobs that must complete before this job runs',
  })
  @IsOptional()
  @IsUUID('4', { each: true })
  dependsOn?: string[];
}
