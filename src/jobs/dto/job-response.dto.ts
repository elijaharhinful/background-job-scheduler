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
  retry_count: number;

  @ApiProperty()
  max_retries: number;

  @ApiPropertyOptional({ type: Date })
  scheduled_at: Date | null;

  @ApiPropertyOptional({ type: Date })
  started_at: Date | null;

  @ApiPropertyOptional({ type: Date })
  completed_at: Date | null;

  @ApiPropertyOptional({ type: Date })
  next_run_at: Date | null;

  @ApiPropertyOptional({ enum: RecurrenceInterval })
  recurrence_interval: RecurrenceInterval | null;

  @ApiPropertyOptional()
  error_message: string | null;

  @ApiProperty()
  effective_priority: number;

  @ApiProperty({ type: Date })
  created_at: Date;

  @ApiProperty({ type: Date })
  updated_at: Date;

  static fromEntity(job: Job): JobResponseDto {
    const dto = new JobResponseDto();
    dto.id = job.id;
    dto.type = job.type;
    dto.payload = job.payload;
    dto.priority = job.priority;
    dto.status = job.status;
    dto.retry_count = job.retryCount;
    dto.max_retries = job.maxRetries;
    dto.scheduled_at = job.scheduledAt;
    dto.started_at = job.startedAt;
    dto.completed_at = job.completedAt;
    dto.next_run_at = job.nextRunAt;
    dto.recurrence_interval = job.recurrenceInterval;
    dto.error_message = job.errorMessage;
    dto.effective_priority = job.effectivePriority;
    dto.created_at = job.createdAt;
    dto.updated_at = job.updatedAt;
    return dto;
  }
}
