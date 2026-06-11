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
  dlq_count: number;

  @ApiProperty()
  active_workers: number;

  @ApiProperty()
  heap_size: number;

  @ApiProperty()
  uptime_seconds: number;
}
