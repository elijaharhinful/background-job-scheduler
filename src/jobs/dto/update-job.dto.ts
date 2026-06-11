import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { JobPriority } from '../../common/enums/job-priority.enum';
import { RecurrenceInterval } from '../../common/enums/recurrence-interval.enum';

export class UpdateJobDto {
  @ApiPropertyOptional({ enum: JobPriority })
  @IsOptional()
  @Type(() => Number)
  @IsEnum(JobPriority)
  priority?: JobPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  max_retries?: number;

  @ApiPropertyOptional({ type: Date })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduled_at?: Date;

  @ApiPropertyOptional({ enum: RecurrenceInterval })
  @IsOptional()
  @IsEnum(RecurrenceInterval)
  recurrence_interval?: RecurrenceInterval;
}
