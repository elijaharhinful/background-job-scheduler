import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus } from '../../common/enums/job-status.enum';
import { JobPriority } from '../../common/enums/job-priority.enum';
import { RecurrenceInterval } from '../../common/enums/recurrence-interval.enum';
import { Job } from '../entities/job.entity';

export class JobResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  payload: Record<string, unknown>;

  @ApiProperty({ enum: JobPriority })
  priority: number;

  @ApiProperty({ enum: JobStatus })
  status: JobStatus;

  @ApiProperty()
  retryCount: number;

  @ApiProperty()
  maxRetries: number;

  @ApiPropertyOptional({ type: Date })
  scheduledAt: Date | null;

  @ApiPropertyOptional({ type: Date })
  startedAt: Date | null;

  @ApiPropertyOptional({ type: Date })
  completedAt: Date | null;

  @ApiPropertyOptional({ type: Date })
  nextRunAt: Date | null;

  @ApiPropertyOptional({ enum: RecurrenceInterval })
  recurrenceInterval: RecurrenceInterval | null;

  @ApiPropertyOptional()
  errorMessage: string | null;

  @ApiProperty()
  effectivePriority: number;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;

  static fromEntity(job: Job): JobResponseDto {
    const dto = new JobResponseDto();
    dto.id = job.id;
    dto.type = job.type;
    dto.payload = job.payload;
    dto.priority = job.priority;
    dto.status = job.status;
    dto.retryCount = job.retryCount;
    dto.maxRetries = job.maxRetries;
    dto.scheduledAt = job.scheduledAt;
    dto.startedAt = job.startedAt;
    dto.completedAt = job.completedAt;
    dto.nextRunAt = job.nextRunAt;
    dto.recurrenceInterval = job.recurrenceInterval;
    dto.errorMessage = job.errorMessage;
    dto.effectivePriority = job.effectivePriority;
    dto.createdAt = job.createdAt;
    dto.updatedAt = job.updatedAt;
    return dto;
  }
}
