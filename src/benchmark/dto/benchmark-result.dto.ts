import { ApiProperty } from '@nestjs/swagger';

export class BenchmarkResultDto {
  @ApiProperty()
  message: string;
}
