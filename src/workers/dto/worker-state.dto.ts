import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkerStateDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  currentJobId: string | null;
}
