import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkerStateDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  current_job_id: string | null;
}
