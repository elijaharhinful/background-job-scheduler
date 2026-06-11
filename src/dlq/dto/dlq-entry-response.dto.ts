import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeadLetter } from '../entities/dead-letter.entity';

export class DlqEntryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  job_id: string;

  @ApiProperty()
  job_type: string;

  @ApiProperty()
  final_error: string;

  @ApiPropertyOptional()
  error_stack: string | null;

  @ApiProperty()
  payload_snapshot: Record<string, unknown>;

  @ApiProperty()
  retry_count: number;

  @ApiProperty({ type: Date })
  created_at: Date;

  @ApiPropertyOptional({ type: Date })
  retried_at: Date | null;

  static fromEntity(entity: DeadLetter): DlqEntryResponseDto {
    const dto = new DlqEntryResponseDto();
    dto.id = entity.id;
    dto.job_id = entity.jobId;
    dto.job_type = entity.jobType;
    dto.final_error = entity.finalError;
    dto.error_stack = entity.errorStack;
    dto.payload_snapshot = entity.payloadSnapshot;
    dto.retry_count = entity.retryCount;
    dto.created_at = entity.createdAt;
    dto.retried_at = entity.retriedAt;
    return dto;
  }
}
