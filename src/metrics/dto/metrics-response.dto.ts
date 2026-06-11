import { ApiProperty } from '@nestjs/swagger';

export class JobMetricsDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  pending: number;

  @ApiProperty()
  processing: number;

  @ApiProperty()
  completed: number;

  @ApiProperty()
  failed: number;

  @ApiProperty()
  cancelled: number;
}

export class MetricsResponseDto {
  @ApiProperty({ type: JobMetricsDto })
  jobs: JobMetricsDto;

  @ApiProperty()
  dlqCount: number;

  @ApiProperty()
  activeWorkers: number;

  @ApiProperty()
  heapSize: number;

  @ApiProperty()
  uptimeSeconds: number;
}
