import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeadLetter } from '../entities/dead-letter.entity';

export class DlqEntryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  jobId: string;

  @ApiProperty()
  jobType: string;

  @ApiProperty()
  finalError: string;

  @ApiPropertyOptional()
  errorStack: string | null;

  @ApiProperty()
  payloadSnapshot: Record<string, unknown>;

  @ApiProperty()
  retryCount: number;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiPropertyOptional({ type: Date })
  retriedAt: Date | null;

  static fromEntity(entity: DeadLetter): DlqEntryResponseDto {
    const dto = new DlqEntryResponseDto();
    dto.id = entity.id;
    dto.jobId = entity.jobId;
    dto.jobType = entity.jobType;
    dto.finalError = entity.finalError;
    dto.errorStack = entity.errorStack;
    dto.payloadSnapshot = entity.payloadSnapshot;
    dto.retryCount = entity.retryCount;
    dto.createdAt = entity.createdAt;
    dto.retriedAt = entity.retriedAt;
    return dto;
  }
}
