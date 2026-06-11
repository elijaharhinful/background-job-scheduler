import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';

export class UpdateWorkerCountDto {
  @ApiProperty({ description: 'Number of desired active workers', example: 5 })
  @IsInt()
  @Min(0)
  @Max(50)
  count: number;
}
