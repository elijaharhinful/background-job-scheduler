import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';

export class RunBenchmarkDto {
  @ApiProperty({ description: 'Number of mock jobs to create', example: 1000 })
  @IsInt()
  @Min(1)
  @Max(100000)
  count: number;
}
